(function(){
  var b=document.body;
  function tog(id,cls){
    var el=document.getElementById(id);
    el.addEventListener('click',function(){
      b.classList.toggle(cls); el.classList.toggle('on',b.classList.contains(cls));
      document.querySelectorAll('.show').forEach(function(x){x.classList.remove('show');});
    });
  }
  tog('btn-quiz','quiz'); tog('btn-ja','hideja');
  document.addEventListener('click',function(e){
    var t=e.target.closest('.n, .ans, .ja'); if(!t) return;
    if(t.classList.contains('ja') && !b.classList.contains('hideja')) return;
    if(!t.classList.contains('ja') && !b.classList.contains('quiz')) return;
    t.classList.toggle('show');
  });
})();
