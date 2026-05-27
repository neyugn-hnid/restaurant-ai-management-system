(function() {
    var hideStyle = document.createElement('style');
    hideStyle.textContent = 'html{overflow:hidden!important}';
    (document.head || document.documentElement).appendChild(hideStyle);
    var l = document.createElement('div');
    l.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;z-index:99999;background:#f2f0eb;display:flex;align-items:center;justify-content:center;transition:opacity 0.6s ease;';
    var s = document.createElement('div');
    s.style.cssText = 'width:48px;height:48px;border:5px solid #e0dcd5;border-top-color:#00754A;border-radius:50%;animation:spin 0.8s linear infinite;';
    l.appendChild(s);
    var k = document.createElement('style');
    k.textContent = '@keyframes spin{to{transform:rotate(360deg)}}';
    (document.head || document.documentElement).appendChild(k);
    function append() { if(document.body){document.body.prepend(l);return true} return false; }
    if(!append()) document.addEventListener('DOMContentLoaded', append);
    function show() {
        l.style.opacity = '0';
        hideStyle.remove();
        setTimeout(function(){ l.remove(); }, 500);
    }
    window.addEventListener('load', function(){ setTimeout(show, 200); });
    setTimeout(show, 3000);
})();