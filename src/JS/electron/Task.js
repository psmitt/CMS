var $jscomp=$jscomp||{};$jscomp.scope={};$jscomp.findInternal=function(a,b,c){a instanceof String&&(a=String(a));for(var d=a.length,e=0;e<d;e++){var f=a[e];if(b.call(c,f,e,a))return{i:e,v:f}}return{i:-1,v:void 0}};$jscomp.ASSUME_ES5=!1;$jscomp.ASSUME_NO_NATIVE_MAP=!1;$jscomp.ASSUME_NO_NATIVE_SET=!1;$jscomp.defineProperty=$jscomp.ASSUME_ES5||"function"==typeof Object.defineProperties?Object.defineProperty:function(a,b,c){a!=Array.prototype&&a!=Object.prototype&&(a[b]=c.value)};
$jscomp.getGlobal=function(a){return"undefined"!=typeof window&&window===a?a:"undefined"!=typeof global&&null!=global?global:a};$jscomp.global=$jscomp.getGlobal(this);$jscomp.polyfill=function(a,b,c,d){if(b){c=$jscomp.global;a=a.split(".");for(d=0;d<a.length-1;d++){var e=a[d];e in c||(c[e]={});c=c[e]}a=a[a.length-1];d=c[a];b=b(d);b!=d&&null!=b&&$jscomp.defineProperty(c,a,{configurable:!0,writable:!0,value:b})}};
$jscomp.polyfill("Array.prototype.find",function(a){return a?a:function(a,c){return $jscomp.findInternal(this,a,c).v}},"es6","es3");var localizePage,restoreTask,saveTask,setMainAndContext,takeStep,taskError;localizePage=function(){$("[data-title]").each(function(){return $(this).prop("title",literal[$(this).attr("data-title")])});$("h2.Verification").text(literal.Verification);return $("h2.Comments").text(literal.Comments)};
takeStep=function(a){var b=$(a);var c=$(window);a=b.parent().siblings("div");a.children('input[type="radio"]').prop("checked",!1);b.prop("checked",!0);$.when(a.find("div").hide(400)).then(function(){var a=b.offset().top-c.scrollTop();if(!(100<a&&a<c.height()-100))return $("html,body").animate({scrollTop:b.offset().top-100},1E3)});$.when(b.prop("checked",!0).parent().children("div").show(400).find("div").hide(400)).then(function(){});return b.focus()};
setMainAndContext=function(){$("#main_task").remove();task.main&&$("header > div").prepend('<img id="main_task" src="/CSS/Task/Task_main.png"\n title="'+literal["Main task"]+"\"\n onclick=\"$.post('/AJAX/Task.php','task_check="+task.main+"')\n.done(function(data){if(!task.main_filename.localeCompare(data))\nlocation='Task.php?task="+encodeURIComponent(task.main_filename)+"&id="+task.main+"';\nelse $('#main_task').remove()})\"/>");$("#context").remove();if(task.context)return $('<div id="context">'+
task.context+"</div>").insertAfter("header")};taskError=function(a){var b=window.open("","_blank");b.document.write(a.responseText);return b.document.close()};
saveTask=function(){task.checkString=task.displayString="";$("article input").each(function(){task.checkString+=$(this).prop("checked")?"1":"0";return task.displayString+="none"===$(this).parent().css("display")?"0":"1"});task.scrollPosition=$("html,body").scrollTop();$.post("/AJAX/Task.php","task_save="+encodeURIComponent(JSON.stringify(task))).done(function(a){try{return window.task=JSON.parse(a),setMainAndContext()}catch(b){}}).fail(function(a){return taskError(a)});return!0};
restoreTask=function(){return $.post("/AJAX/Task.php","task_restore="+encodeURIComponent(JSON.stringify(task))).done(function(a){try{return window.task=JSON.parse(a),setMainAndContext(),"modified"===task.checkString?alert(literal["The task description has been recently modified. Restart the procedure."]):$("article input").each(function(a){$(this).prop("checked",task.checkString.length>a&&"1"===task.checkString.charAt(a));return task.displayString.length>a&&"0"===task.displayString.charAt(a)?$(this).parent().hide():
$(this).parent().show()}),$("html,body").scrollTop(task.scrollPosition)}catch(b){return saveTask()}}).fail(function(a){return taskError(a)})};$(document).ready(function(){$.when(loadDictionary()).done(localizePage);return restoreTask()});//# sourceMappingURL=Task.js.map
