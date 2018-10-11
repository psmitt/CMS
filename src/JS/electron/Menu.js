var $jscomp=$jscomp||{};$jscomp.scope={};$jscomp.findInternal=function(a,b,d){a instanceof String&&(a=String(a));for(var c=a.length,e=0;e<c;e++){var f=a[e];if(b.call(d,f,e,a))return{i:e,v:f}}return{i:-1,v:void 0}};$jscomp.ASSUME_ES5=!1;$jscomp.ASSUME_NO_NATIVE_MAP=!1;$jscomp.ASSUME_NO_NATIVE_SET=!1;$jscomp.defineProperty=$jscomp.ASSUME_ES5||"function"==typeof Object.defineProperties?Object.defineProperty:function(a,b,d){a!=Array.prototype&&a!=Object.prototype&&(a[b]=d.value)};
$jscomp.getGlobal=function(a){return"undefined"!=typeof window&&window===a?a:"undefined"!=typeof global&&null!=global?global:a};$jscomp.global=$jscomp.getGlobal(this);$jscomp.polyfill=function(a,b,d,c){if(b){d=$jscomp.global;a=a.split(".");for(c=0;c<a.length-1;c++){var e=a[c];e in d||(d[e]={});d=d[e]}a=a[a.length-1];c=d[a];b=b(c);b!=c&&null!=b&&$jscomp.defineProperty(d,a,{configurable:!0,writable:!0,value:b})}};
$jscomp.polyfill("Array.prototype.find",function(a){return a?a:function(a,d){return $jscomp.findInternal(this,a,d).v}},"es6","es3");var addFavorite,displayMenu,expandMenu,highLight,localizePage,lockMenu,removeFavorite,saveFavorites,saveLocks,searchMenu,setStartupPage;window.addFavorite=addFavorite;window.displayMenu=displayMenu;window.expandMenu=expandMenu;window.highLight=highLight;window.localizePage=localizePage;window.lockMenu=lockMenu;window.removeFavorite=removeFavorite;
window.saveFavorites=saveFavorites;window.saveLocks=saveLocks;window.searchMenu=searchMenu;window.setStartupPage=setStartupPage;localizePage=function(){$("[data-title]").each(function(){return $(this).prop("title",literal[$(this).attr("data-title")])});return $("#FAVORITES > a").text(literal.FAVORITES)};
$("#language").change(function(){return $.post("/AJAX/Profile.php","language="+$(this).val()).always(function(){return $.when(parent.loadDictionary()).done(function(){localizePage();return $("iframe",parent.document).each(function(){var a;return"function"===typeof(a=this.contentWindow).localizePage?a.localizePage():void 0})})})});
setStartupPage=function(a){var b,d,c;var e=b="";if(a){if(!parent.isClosed("Task")){a=parent.frames.Task;var f="&id="+(null!=(d=a.task)?d.subtask:void 0);(b=/[\\?&]main=([^&#]*)/.exec(a.location.search))?b=a.location.href.replace(b[0],f):(b=a.location.href,null!=(c=a.task)&&c.subtask&&!/[\\?&]id=([^&#]*)/.exec(a.location.search)&&(b+=f))}parent.isClosed("Data")||(e=parent.frames.Data.location.href)}$.post("/AJAX/Profile.php","startup_task="+encodeURIComponent(b));return $.post("/AJAX/Profile.php",
"startup_data="+encodeURIComponent(e))};highLight=function(a){$("a").removeClass("selected");return $(a).addClass("selected").blur()};lockMenu=function(a){$(a).toggleClass("locked");saveLocks();return!1};
displayMenu=function(a){var b;var d=$(a).find("div").toArray().reverse();var c=0;for(b=d.length;c<b;c++){var e=d[c];e=$(e);(e.children("span").hasClass("locked")||e.children("a").hasClass("selected"))&&e.addClass("display");e.hasClass("display")?(e.parent().addClass("display"),e.removeClass("display").show()):e.hide()}return $(a).removeClass("display")};expandMenu=function(a){var b=!1;$(a.parentNode).children("div").filter(":hidden").each(function(){$(this).show("fast");return b=!0});if(!b)return displayMenu(a.parentNode)};
searchMenu=function(a){var b;$("#search_field").val()?b=new RegExp($("#search_field").val(),"im"):a=!1;$("body > div").each(function(){var d;var c=$(this).find("a");c.removeClass("selected");if(a){var e=0;for(d=c.length;e<d;e++){var f=c[e];b.test(f.textContent)&&$(f).addClass("selected")}}return displayMenu(this)});$("#search_field").focus();return!1};
saveFavorites=function(){var a="";$("#FAVORITES > div a").each(function(){var b,d,c;var e=$(this).attr("href").split("?");var f=e[0].split(".");f="Table"===(b=f[0])||"Task"===b||"Tree"===b||"View"===b?f[0].toLowerCase()+'" order="'+(null!=(d=e[1])?d.slice(1+(null!=(c=e[1])?c.indexOf("="):void 0)):void 0):'link" order="'+$(this).attr("href");return a+='<menu title="'+$(this).text()+'" class="'+f+'"\n frame="'+$(this).attr("target")+'"/>'});return $.post("/AJAX/Menu.php","menu_save_favorites="+encodeURIComponent(a))};
addFavorite=function(a){var b,d;a=$(a).next();if(b=prompt(literal["Add to Favorites:"],$(a).text())){var c=$("#FAVORITES > div a");var e=0;for(d=c.length;e<d;e++){var f=c[e];if($(f).text()===b){$(f).parent().hide();var g=f}}null==g&&($("#FAVORITES").append('<div style="display:none"><span class="item"\n oncontextmenu="return lockMenu(this)"\n ondblclick="removeFavorite(this)"></span><a\n onclick="highLight(this)" href="'+$(a).attr("href")+'"\n target="'+$(a).attr("target")+'">'+b+"</a></div>"),g=
$("#FAVORITES a").last(),saveFavorites());highLight(g);return expandMenu($("#FAVORITES > span")[0])}};removeFavorite=function(a){if(confirm(literal["Remove favorite?"]))return $(a).parent().hide("fast",function(){$(a).parent().remove();return saveFavorites()})};$("#FAVORITES").on("dragstart","a",function(a){return a.target.id="dragged"});$("#FAVORITES").on("dragend","a",function(a){return a.target.id=null});
$("#FAVORITES").on("dragenter","a",function(a){a.preventDefault();a.stopPropagation();return $(a.target).css("border-top","solid 2px black")});$("#FAVORITES").on("dragover","a",function(a){a.preventDefault();return a.stopPropagation()});$("#FAVORITES").on("dragleave","a",function(a){a.preventDefault();a.stopPropagation();return $(a.target).css("border-top","")});
$("#FAVORITES").on("drop","a",function(a){a.preventDefault();a.stopPropagation();$(a.target).css("border-top","");$("#dragged").parent().insertBefore($(a.target).parent());return saveFavorites()});
saveLocks=function(){var a=[];$("body > div").each(function(){return $("span.locked",this).each(function(){var b=$(this).next();var d=$(this).parent().parent();var c={class:"submenu",title:$(b).text(),parent:$(d).attr("id")};"FAVORITES"!==c.parent&&(c.parent=$(d).children("a").text());$(this).hasClass("item")&&(c.class="item",c.href=$(b).attr("href"),c.target=$(b).attr("target"));return a.push(c)})});return $.post("/AJAX/Menu.php","menu_save_locks="+encodeURIComponent(JSON.stringify(a)))};
$(document).ready(function(){$.when(parent.loadDictionary()).done(localizePage);"cms4test"===window.location.hostname.toLowerCase()&&$("body").css("background","url(/CSS/Menu/Menu_test.png) no-repeat top right fixed");try{return $.post("/AJAX/Menu.php","menu_restore_locks=",function(a){var b;var d=JSON.parse(a);a=0;for(b=d.length;a<b;a++){var c=d[a];"item"===c.class?$("body > div").find('a[href="'+c.href+'"][target="'+c.target+'"]').each(function(){if($(this).text()===c.title)if("FAVORITES"===c.parent){if("FAVORITES"===
$(this).parent().parent().attr("id"))return $(this).prev().toggleClass("locked")}else if(c.parent===$(this).parent().parent().children("a").text())return $(this).prev().toggleClass("locked")}):$("body > div").find("span.submenu").each(function(){if($(this).next().text()===c.title&&$(this).parent().parent().children("a").text()===c.parent)return $(this).toggleClass("locked")})}return searchMenu()})}catch(a){return saveLocks()}});//# sourceMappingURL=Menu.js.map