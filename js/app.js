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
const db = firebase.firestore();
const auth = firebase.auth();
const updatesCollection = db.collection("updates");

let table, editDocId = null;
let topicColorMap = {};

async function updateCategoryList() {
  const snap = await updatesCollection.get();
  const cats = new Set(), subs = new Set();
  snap.forEach(docSnap => {
    const d = docSnap.data();
    if (d.Topic)    cats.add(d.Topic);
    if (d.Subtopic) subs.add(d.Subtopic);
  });
  // Populate topics dropdown
  const catDL = document.getElementById('categories');
  catDL.innerHTML = '';
  cats.forEach(c => {
    const opt = document.createElement('option');
    opt.value = c;
    catDL.appendChild(opt);
  });
  // Populate subtopics dropdown
  const subDL = document.getElementById('subtopics');
  subDL.innerHTML = '';
  subs.forEach(s => {
    const opt = document.createElement('option');
    opt.value = s;
    subDL.appendChild(opt);
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
    welcomeMsg.text(`Welcome back, ${capitalized}`);
    loginForm.hide(); welcomeContainer.show().css('align-items','center');
  } else { loginForm.show(); welcomeContainer.hide(); }
  $('.requires-auth').toggle(isAuth);
  if (table) table.columns.adjust().draw(false);
}

function openModal(edit=false,data={}){
  editDocId=edit?data.id:null;
  window.originalTopic = data.Topic;
  window.originalColor = data.Color;
  $('#modalTitle').text(edit?'Edit Entry':'Add Entry');
  $('#modalDate').val(data.Date||'');
  $('#modalCategory').val(data.Topic||'');
  $('#modalSubtopic').val(data.Subtopic || ''); 
  $('#modalDescription').val(data.Description||'');
  $('#modalLink').val(data.Link||'');
  const base=topicColorMap[data.Topic]||'#ffffff';
  $('#modalColor').val(edit?(data.Color||base):base);
  $('#modalOverlay').show();
}

function closeModal(){ $('#modalOverlay').hide(); editDocId=null; }

$(function(){
  table=$('#dataTable').DataTable({dom:'t',paging:false,info:false,lengthChange:false,ordering:true,autoWidth:false,
    columnDefs:[{targets:0,visible:false},{orderable:false,targets:[3,4,5,6,7]},{width:'5%',targets:1},{width:'10%',targets:2},{width:'65%',targets:3},{width:'5%',targets:4,className:'dt-center'},{width:'5%',targets:5,className:'dt-center'},{width:'5%',targets:6,className:'dt-center'},{width:'5%',targets:7,className:'dt-center'}],
    columns:[
      {data:'Pinned'},
      {data:'Date',render:d=>{const[y,m,day]=d.split('-');return`${m}/${day}/${y}`;}},
      { 
        data: null,
        render: d => d.Subtopic || d.Topic
      },
      {data:'Description'},
      {data:'Link', render: d => d ? `<a href="${d}" target="_blank" class="link-btn" title="View Link">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20"
            viewBox="0 0 24 24" fill="none" stroke="#000" stroke-width="2"
            stroke-linecap="round" stroke-linejoin="round">
            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
            </svg></a>` : '' },
      {data: null, defaultContent: `<span class="edit-btn requires-auth" title="Edit">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20"
            viewBox="0 0 24 24" fill="none" stroke="#000" stroke-width="2"
            stroke-linecap="round" stroke-linejoin="round">
            <path d="M20 14.66V20a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h5.34"/>
            <polygon points="18 2 22 6 12 16 8 16 8 12 18 2"/>
            </svg></span>` },
      {data: null, defaultContent: `<span class="pin-btn requires-auth" title="Pin/Unpin">
             <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24"
             fill="none" stroke="#000" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
             <circle cx="11.5" cy="8.5" r="5.5"/><path d="M11.5 14v7"/>
             </svg></span>` },
      {data: null, defaultContent: `<span class="remove-btn requires-auth" title="Delete">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#000" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="3 6 5 6 21 6"></polyline>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
            <line x1="10" y1="11" x2="10" y2="17"></line>
            <line x1="14" y1="11" x2="14" y2="17"></line>
            </svg></span>` }
    ],
    order:[[0,'desc'],[1,'desc']],
    rowCallback:(row,data)=>data.Color?$(row).css('box-shadow',`inset 5px 0px 0px 0px ${data.Color}`):$(row).css('box-shadow','')
  });

  $('#tableSearch').on('keyup',()=>table.search($('#tableSearch').val()).draw());

  updatesCollection.orderBy('Date','asc').onSnapshot(snap=>{
    const dataArr=[]; topicColorMap={};
    snap.forEach(docSnap=>{const d=docSnap.data();dataArr.push({...d,id:docSnap.id});if(d.Topic&&d.Color)topicColorMap[d.Topic]=d.Color;});
    table.clear().rows.add(dataArr).draw(); updateCategoryList(); toggleAuthUI(!!auth.currentUser);
    $('#dataTable tbody tr').each(function(){const rd=table.row(this).data();$(this).css(rd&&rd.Pinned?{'background-color':'#e0e0e0'}:{'background-color':'','font-weight':''});});
  });

  $('#addEntryBtn').click(()=>openModal());
  $('#modalCancel').click(closeModal);
  $('#modalSubmit').click(async()=>{
    const entry = {
      Date: $('#modalDate').val().trim(),
      Topic: $('#modalCategory').val().trim(),
      Subtopic: $('#modalSubtopic').val().trim(),    // ← ADDED
      Description: $('#modalDescription').val().trim(),
      Link: $('#modalLink').val().trim(),
      Pinned: false,
      Color: $('#modalColor').val()
    };
        // if editing and only the color changed for the same Topic, update all docs with that Topic
        if (editDocId
          && entry.Topic === window.originalTopic
          && entry.Color  !== window.originalColor) {
        const batch = db.batch();
        const snap  = await updatesCollection
                            .where('Topic','==', entry.Topic)
                            .get();
        snap.forEach(docSnap => {
          batch.update(updatesCollection.doc(docSnap.id), { Color: entry.Color });
        });
        await batch.commit();
      }
  
    if (!entry.Date || !entry.Topic || !entry.Description) {
      return alert('Please fill in Date, Topic, and Description.');
    }
    try {
      if (editDocId) {
        await updatesCollection.doc(editDocId).update(entry);
      } else {
        await updatesCollection.add(entry);
      }
    } catch(e) {
      alert(e.message || e);
    }
    closeModal();
  });
  

  $('#dataTable tbody').on('click','.edit-btn',function(){if(!auth.currentUser) return alert('Sign in to edit'); openModal(true,table.row($(this).closest('tr')).data());});
  $('#dataTable tbody').on('click','.remove-btn',async function(){if(!auth.currentUser) return alert('Sign in to remove'); const data=table.row($(this).closest('tr')).data(); try{await updatesCollection.doc(data.id).delete();}catch(e){alert(e);} });
  $('#dataTable tbody').on('click','.pin-btn',async function(){if(!auth.currentUser) return alert('Sign in to pin/unpin'); const data=table.row($(this).closest('tr')).data(); try{await updatesCollection.doc(data.id).update({Pinned:!data.Pinned});}catch(e){alert(e.message||e);} });

  $('#loginForm').submit(async e=>{ e.preventDefault(); const email=$('#email').val(), pwd=$('#password').val(); if(!email.endsWith('@ynap.com')) return alert('Use @ynap.com'); try{ await auth.signInWithEmailAndPassword(email,pwd); }catch(e){ alert(e.message); } });
  $('#logoutBtn').click(()=>auth.signOut());
  auth.onAuthStateChanged(user=>toggleAuthUI(!!user));

  $('#modalCategory').on('input',function(){ const t=$(this).val().trim(); $('#modalColor').val(topicColorMap[t]||'#ffffff'); });
});