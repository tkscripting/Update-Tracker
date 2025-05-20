// Initialize Firebase (compat)
const firebaseConfig = {
  apiKey: "AIzaSyCP0E5xBBzihujcQC4fmPblK-frZ3_wZiw",
  authDomain: "updates-9255b.firebaseapp.com",
  projectId: "updates-9255b",
  storageBucket: "updates-9255b.appspot.com",
  messagingSenderId: "171550583463",
  appId: "1:171550583463:web:c6c6ffdb410584a130c982",
  measurementId: "G-39G2BNV0M3"
};
firebase.initializeApp(firebaseConfig);
firebase.auth().onAuthStateChanged((user) => {
  console.log("My UID:", user.uid);
});
const db = firebase.firestore();
const auth = firebase.auth();
const updatesCollection = db.collection("updates");

function typeWriter(element, text, speed = 75, callback) {
  let i = 0;
  element.text('');
  function type() {
    if (i < text.length) {
      element.append(text.charAt(i));
      i++;
      setTimeout(type, speed);
    } else {
      if (callback) callback();
    }
  }
  type();
}


let table, editDocId = null;
let topicColorMap = {};

async function updateCategoryList() {
  const snap = await updatesCollection.get();
  const topicSubMap = {};
  snap.forEach(docSnap => {
    const d = docSnap.data();
    if (!d.Topic) return;
    if (!topicSubMap[d.Topic]) topicSubMap[d.Topic] = new Set();
    if (d.Subtopic) topicSubMap[d.Topic].add(d.Subtopic);
  });

  // Sort topics & subtopics
  const topics = Object.keys(topicSubMap).sort();
  const allSubs = Array.from(
    new Set(Object.values(topicSubMap)
      .flatMap(s => Array.from(s)))
  ).sort();

  // — Populate filter selects (unchanged) —
  const topicFilter = document.getElementById('filterTopic');
  topicFilter.innerHTML = '<option value="">All Categories</option>';
  topics.forEach(t => {
    const opt = document.createElement('option');
    opt.value = t; opt.textContent = t;
    topicFilter.appendChild(opt);
  });

  const subFilter = document.getElementById('filterSubtopic');
  function fillFilterSubs(list) {
    subFilter.innerHTML = '<option value="">All Subcategories</option>';
    list.forEach(s => {
      const opt = document.createElement('option');
      opt.value = s; opt.textContent = s;
      subFilter.appendChild(opt);
    });
  }
  fillFilterSubs(allSubs);

  topicFilter.addEventListener('change', () => {
    const sel = topicFilter.value;
    if (sel && topicSubMap[sel]) {
      fillFilterSubs(Array.from(topicSubMap[sel]).sort());
    } else {
      fillFilterSubs(allSubs);
    }
    subFilter.value = '';
    table.draw();
  });

  // — NEW: Populate the two datalists for the modal inputs —
  const topicsList = document.getElementById('topicsList');
  const subsList   = document.getElementById('subtopicsList');
  function fillDataList(dlElement, items) {
    dlElement.innerHTML = '';
    items.forEach(val => {
      const opt = document.createElement('option');
      opt.value = val;
      dlElement.appendChild(opt);
    });
  }
  fillDataList(topicsList, topics);
  fillDataList(subsList, allSubs);

  // — NEW: When user types/selects a Topic in the modal, limit Subtopic dropdown to matching ones —
  const modalCat = document.getElementById('modalCategory');
  modalCat.addEventListener('input', () => {
    const chosen = modalCat.value;
    if (chosen && topicSubMap[chosen]) {
      fillDataList(subsList, Array.from(topicSubMap[chosen]).sort());
    } else {
      fillDataList(subsList, allSubs);
    }
    // clear any stale subtopic
    document.getElementById('modalSubtopic').value = '';
  });
}

function toggleAuthUI(isAuth) {
  const welcomeContainer = $('#welcomeContainer');
  const loginForm = $('#loginForm');
  const welcomeMsg = $('#welcomeMessage');

  if (isAuth && auth.currentUser) {
    const email = auth.currentUser.email;
    const firstName = email.split('@')[0].split('.')[0];
    const capitalized = firstName.charAt(0).toUpperCase() + firstName.slice(1);
    const msg = `Welcome back, ${capitalized}`;

    // If welcomeTyped flag NOT set, do typewriter effect
    if (!sessionStorage.getItem('welcomeTyped')) {
      typeWriter(welcomeMsg, msg, 75, () => {
        sessionStorage.setItem('welcomeTyped', 'true');
      });
    } else {
      // Already typed, just set text directly
      welcomeMsg.text(msg);
    }

    loginForm.hide();
    welcomeContainer.show().css('align-items', 'center');
  } else {
    loginForm.show();
    welcomeContainer.hide();
    // Reset flag on logout so next login animates again
    sessionStorage.removeItem('welcomeTyped');
  }

  $('.requires-auth').toggle(isAuth);
  if (table) table.columns.adjust().draw(false);
}

function openModal(edit = false, data = {}) {
  editDocId = edit ? data.id : null;
  window.originalTopic = data.Topic;
  window.originalColor = data.Color;

  $('#modalTitle').text(edit ? 'Edit Entry' : 'Add Entry');
  $('#modalDate').val(data.Date || '');
  $('#modalCategory').val(data.Topic || '');
  $('#modalSubtopic').val(data.Subtopic || '');
  $('#modalDescription').val(data.Description || '');
  $('#modalLink').val(data.Link || '');

  const base = topicColorMap[data.Topic] || '##fafafa';
  const startingColor = data.Color || base;

  $('#modalColor').val(startingColor); // Hidden input
  $('#colorBarPreview').css('background-color', startingColor); // Visible preview bar
  $('#colorWheelContainer').hide().empty(); // Reset wheel display

  $('#modalOverlay').show();

  let colorPicker; // Declare this so it's accessible inside the click handler

  // On click, toggle color wheel
$('#colorBarPreview').off('click').on('click', () => {
  $('#colorModalOverlay').show();
  $('#colorWheelStandalone').empty(); // Reset on each open

  const current = $('#modalColor').val() || '##fafafa';

  const colorPicker = new iro.ColorPicker('#colorWheelStandalone', {
    width: 200,
    color: current,
    layout: [
      { component: iro.ui.Wheel },
      { component: iro.ui.Slider, options: { sliderType: 'value' } },
      { component: iro.ui.Slider, options: { sliderType: 'alpha' } } // ✅ adds alpha
    ]
  });

  colorPicker.on('color:change', function (color) {
    const rgba = color.rgbaString;
    $('#modalColor').val(rgba);
    $('#colorBarPreview').css('background-color', rgba);
  });
});

}

function closeModal() {
  $('#modalOverlay').hide();
  $('#colorModalOverlay').hide(); // ✅ Close the color picker too
  editDocId = null;
}

function highlightNewestPerSubtopic() {
  const newestMap = {};

  table.rows().every(function () {
    const d = this.data();
    const key = d.Subtopic || d.Topic;

    const dateOnly = new Date(d.Date).getTime();
    const ts = typeof d.Timestamp === 'number'
      ? d.Timestamp
      : 0;

    const existing = newestMap[key];

    if (
      !existing ||
      dateOnly > existing.date ||
      (dateOnly === existing.date && ts > existing.ts)
    ) {
      newestMap[key] = { date: dateOnly, ts, row: this.node() };
    }
  });

  $('#dataTable tbody tr').removeClass('newest-subtopic');
  Object.values(newestMap).forEach(item => {
    $(item.row).addClass('newest-subtopic');
  });
}

$.fn.dataTable.ext.order['date-with-timestamp'] = function(settings, colIndex) {
  return this.api().column(colIndex, { order: 'index' }).nodes().map(function(td, i) {
    const rowData = table.row(td).data();
    const dateValue = new Date(rowData.Date).getTime();
    const ts = typeof rowData.Timestamp === 'number' ? rowData.Timestamp : 0;

    // Combine date and timestamp: high precision sortable value
    return dateValue + (ts % (24 * 60 * 60 * 1000)); // adds time-of-day precision
  });
};


$(function(){
  $.fn.dataTable.ext.search.push(function(settings, data, dataIndex) {
  const start = $('#startDate').val();
  const end = $('#endDate').val();
  const dateStr = data[1]; // Assumes Date is in 2nd column (index 1)
  const entryDate = new Date(dateStr);

  if (!start && !end) return true;
  if (start && entryDate < new Date(start)) return false;
  if (end && entryDate > new Date(end)) return false;

  return true;
});
  table = $('#dataTable').DataTable({
    dom: 't', paging: false, info: false, lengthChange: false, ordering: true, autoWidth: false,
    columnDefs: [
      { targets: 0, visible: false },
      { orderable: false, targets: [3,4,5,6,7] },
      { width: '5%', targets: 1 },
      { width: '10%', targets: 2 },
      { width: '65%', targets: 3 },
      { width: '5%', targets: 4, className: 'dt-center' },
      { width: '5%', targets: 5, className: 'dt-center' },
      { width: '5%', targets: 6, className: 'dt-center' },
      { width: '5%', targets: 7, className: 'dt-center' }
    ],
    columns: [
      { data: 'Pinned' },
      {
        data: 'Date',
        render: d => {
          const [y, m, day] = d.split('-');
          return `${m}/${day}/${y}`;
        },
        orderDataType: 'date-with-timestamp'
      },
      {
        data: null,
        render: d => {
          const display = d.Subtopic || d.Topic;
          const topic = d.Topic || '';
          return `<span title="Topic: ${topic}">${display}</span>`;
        }
      },
      { data: 'Description' },
      { data: 'Link', render: d => d ?
          `<a href="${d}" target="_blank" class="link-btn" title="View Link">` +
          `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">` +
          `<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>` +
          `<path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg></a>` : '' },
      { data: null, defaultContent: `<span class="edit-btn requires-auth" title="Edit">` +
          `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">` +
          `<path d="M20 14.66V20a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h5.34"/>` +
          `<polygon points="18 2 22 6 12 16 8 16 8 12 18 2"/></svg></span>` },
      { data: null, defaultContent: `<span class="pin-btn requires-auth" title="Pin/Unpin">` +
          `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">` +
          `<circle cx="11.5" cy="8.5" r="5.5"/><path d="M11.5 14v7"/></svg></span>` },
      { data: null, defaultContent: `<span class="remove-btn requires-auth" title="Delete">` +
          `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">` +
          `<polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg></span>` }
    ],
    order: [[0,'desc'],[1,'desc']],
    rowCallback: (row,data) => data.Color ? $(row).css('box-shadow', `inset 5px 0px 0px 0px ${data.Color}`) : $(row).css('box-shadow','')
  });

  $('#startDate, #endDate').on('change', function () {
  $('#dataTable').DataTable().draw();
});

  // Text search
  $('#tableSearch').on('keyup', () => table.search($('#tableSearch').val()).draw());

  // Custom filtering
  $.fn.dataTable.ext.search.push((settings, dataArr, dataIndex) => {
    if (settings.nTable.id !== 'dataTable') return true;
    const row = table.row(dataIndex).data();
    const t = $('#filterTopic').val();
    const s = $('#filterSubtopic').val();
    if (t && row.Topic !== t) return false;
    if (s && row.Subtopic !== s) return false;
    return true;
  });

  // Redraw on filter change
  $('#filterTopic, #filterSubtopic').on('change', () => table.draw());

$('#resetBtn').on('click', function () {
  $('#filterTopic').val('');
  $('#filterSubtopic').val('');
  $('#tableSearch').val('');
  $('#startDate').val('');       // clear start date
  $('#endDate').val('');         // clear end date
  table.search('').draw();
  table.draw();                  // ensure the custom filter is re-applied
});


  // Snapshot listener
  updatesCollection.orderBy('Date','asc').onSnapshot(snap => {
    const dataArr = [];
    topicColorMap = {};
    snap.forEach(docSnap => {
      const d = docSnap.data();
      dataArr.push({ ...d, id: docSnap.id });
      if (d.Topic && d.Color) topicColorMap[d.Topic] = d.Color;
    });
    table.clear().rows.add(dataArr).draw();
    updateCategoryList();
    toggleAuthUI(!!auth.currentUser);
    $('#dataTable tbody tr').each(function() {
      const rd = table.row(this).data();
      $(this).toggleClass('pinned-row', rd && rd.Pinned);
    });    
    highlightNewestPerSubtopic();
  });

  table.on('draw', highlightNewestPerSubtopic);


  $('#addEntryBtn').click(()=>openModal());
  $('#modalCancel').click(closeModal);
  $('#modalOverlay').on('click', function(e) {
  if (e.target === this) closeModal();
  });
  $('#modalSubmit').click(async()=>{
    const entry = {
      Date: $('#modalDate').val().trim(),
      Topic: $('#modalCategory').val().trim(),
      Subtopic: $('#modalSubtopic').val().trim(),
      Description: $('#modalDescription').val().trim(),
      Link: $('#modalLink').val().trim(),
      Pinned: false,
      Color: $('#modalColor').val(),
      Timestamp: Date.now() 
    };
    if(!entry.Date||!entry.Topic||!entry.Description) return alert('Please fill in Date, Topic, and Description.');

    // Color ripple on edit
    if(editDocId && entry.Topic===window.originalTopic && entry.Color!==window.originalColor) {
      const batch = db.batch();
      const snap  = await updatesCollection.where('Topic','==',entry.Topic).get();
      snap.forEach(docSnap=>batch.update(updatesCollection.doc(docSnap.id),{Color: entry.Color}));
      await batch.commit();
    }

    try {
      if(editDocId) {
        await updatesCollection.doc(editDocId).update(entry);
      } else {
        await updatesCollection.add(entry);
        // Ripple color on create
        const batch = db.batch();
        const snap  = await updatesCollection.where('Topic','==',entry.Topic).get();
        snap.forEach(docSnap=>batch.update(updatesCollection.doc(docSnap.id),{Color: entry.Color}));
        await batch.commit();
      }
    } catch (e) { alert(e.message||e); }

    closeModal();
  });

  $('#closeColorModal').on('click', function () {
  $('#colorModalOverlay').hide();
});

$('#colorModalOverlay').on('click', function (e) {
  if (e.target === this) {
    $(this).hide();
  }
});

  $('#dataTable tbody').on('click','.edit-btn',function(){ if(!auth.currentUser) return alert('Sign in'); openModal(true, table.row($(this).closest('tr')).data()); });
  $('#dataTable tbody').on('click','.remove-btn',async function(){ if(!auth.currentUser) return alert('Sign in'); const data=table.row($(this).closest('tr')).data(); try{await updatesCollection.doc(data.id).delete();}catch(e){alert(e);} });
  $('#dataTable tbody').on('click','.pin-btn',async function(){ if(!auth.currentUser) return alert('Sign in'); const data=table.row($(this).closest('tr')).data(); try{await updatesCollection.doc(data.id).update({Pinned:!data.Pinned});}catch(e){alert(e.message||e);} });

$('#loginForm').submit(async e => {
  e.preventDefault();
  const email = $('#email').val();
  const pwd = $('#password').val();
  
  if (!email.endsWith('@ynap.com')) return alert('Use @ynap.com');
  
  try {
    await auth.signInWithEmailAndPassword(email, pwd);
  } catch (error) {
    // Customize error message based on code
    if (error.code === 'auth/invalid-login-credentials') {
      alert('No account found with this email or password is incorrect\n\nPlease contact your manager if you need an account');
    } else {
      alert(error.message || 'An error occurred during sign-in.');
    }
  }
});

  $('#logoutBtn').click(()=>auth.signOut());
  auth.onAuthStateChanged(user=>toggleAuthUI(!!user));

  $('#modalCategory').on('input',function(){ const t=$(this).val().trim(); $('#modalColor').val(topicColorMap[t]||'##fafafa'); });

  // On load: read preference
  const hasDark = localStorage.getItem('darkMode') === 'true';
  if (hasDark) document.body.classList.add('dark-mode');

  // Wrap the existing Konami listener so it also persists
  const konami = [38,38,40,40,37,39,37,39,66,65];
  let idx = 0;
  document.addEventListener('keydown', e => {
    if (e.keyCode === konami[idx]) {
      idx++;
      if (idx === konami.length) {
        document.body.classList.toggle('dark-mode');
        const isNow = document.body.classList.contains('dark-mode');
        localStorage.setItem('darkMode', isNow);
        idx = 0;
      }
    } else {
      idx = 0;
    }
  });

// 3️⃣ Time‑Travel Log: warn if date in the future
$('#modalSubmit').on('click', function(e){
  const picked = $('#modalDate').val();
  if (picked) {
    const selectedDate = new Date(picked);
    const today = new Date();
    // zero out time for accurate comparison
    selectedDate.setHours(0,0,0,0);
    today.setHours(0,0,0,0);
    if (selectedDate > today) {
      e.preventDefault(); // stop form submission
      return alert(
        '🚨 Time‑Travel Alert!\n' +
        'You’re trying to log an entry from the future. Please double‑check your date.'
      );
    }
  }
});

});
(function rotateLogoDaily() {
  const logos = [
    'images/Update Clean.png',
    'images/Update Pixel.png'
  ];

  const today = new Date();
  // Get the day number (e.g., days since epoch)
  const dayNumber = Math.floor(today.getTime() / (1000 * 60 * 60 * 24));
  
  // Use modulo 2 to alternate logos daily
  const logoIndex = dayNumber % logos.length;

  const logoImg = document.getElementById('dailyLogo');
  if (logoImg) {
    logoImg.src = logos[logoIndex];
  }
})();
