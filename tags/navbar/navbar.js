//looks for an active anchor tag
function setActive (){
    var list = goat.getUnder($tag, '.link');
    var url = location.hash || '/';

    list.forEach(function (ele){
        if(ele.hash === url) {
            if (!ele.classList.value.includes(' active'))
                ele.classList.value += ' active';
        } else
            ele.classList.value = ele.classList.value.replace(' active', '');
    })
}
window.addEventListener('hashchange', setActive);
window.addEventListener('load', setActive);
setActive();