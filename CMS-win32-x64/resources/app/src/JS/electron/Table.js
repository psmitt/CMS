var deleteRow,editRow,getClause,newOrCancel,record;record=null;
getClause=function(e){if(!e)return" WHERE 0";if(e.id.length)return JSON.stringify(e.id);var b="";$("#editor-row td").each(function(a){var f,c,r;a=c=null!=(f=e.data[a])?f:"";if($(".selection",this).length){var g=$("input:first",this).attr("name");f=$(".selected",this).attr("id");c&&(a=null!=(r=options[f][c])?r:$(c).data("value"))}else $("select",this).length?(g=$("select",this).attr("name"),a=$("select option",this).filter(function(){return $(this).html()===c}).val()):g=this.firstChild.name;return a?
($.isNumeric(a)||(a=a.replace(/'/g,"''").replace(/\\/g,"\\\\").replace(/[\n]/g,"\\n")),b+=" AND "+g+"='"+a+"'"):b+=" AND "+g+" "+($.isNumeric(a)?"=0":"IS NULL")});return" WHERE "+b.replace(" AND ","")};
newOrCancel=function(){record=null;var e=[];$("#filter-row input").each(function(){return e.push(this.value)});resetForm();$("#filter-row input").each(function(b){return $(this).val(e[b])});$("#filter-row").toggle();$("#editor-row").toggle();return $("#editor-row").is(":visible")?$("#title-row button span").switchClass("ui-icon-document","ui-icon-cancel").attr("title",literal.Cancel):$("#title-row button span").switchClass("ui-icon-cancel","ui-icon-document").attr("title",literal.New)};
editRow=function(e){record=data_rows[$(e).parent().parent().data("index")];$("#editor-row td").each(function(b){var a=record.data[b];if($(".selection",this).length){b=$(".selected",this).attr("id");var f=$("#"+b);var c=$("#"+b+"-value");if(""===a)return f.val(""),c.val("");if(options[b][a])return f.val(a),c.val(options[b][a]);f.val($(a).html());return c.val($(a).data("value"))}return $("select",this).length?$("select",this).val($("select option",this).filter(function(){return $(this).html()===a}).val()):
this.firstChild.value=null!=a?a:""});$('form input[name="record-id"]').val(getClause(record));$("#editor-row").show();$("#filter-row").hide();return $("#title-row button span").switchClass("ui-icon-document","ui-icon-cancel")};
deleteRow=function(e){$("form").prop("disabled",!0);displayMessage("DELETION");var b=$(e).parent().parent();$("td",b).css({"border-top":"medium solid red","border-bottom":"medium solid red"});var a=data_rows[$(b).data("index")];var f=[{name:"table-name",value:$('input[name="table-name"]').val()},{name:"record-id",value:getClause(a)}];var c=function(){return $.post("/AJAX/Table.php","table_delete="+encodeURIComponent(JSON.stringify(f))).done(function(c){try{var g=JSON.parse(c);displayMessage(g[0]+
literal[" row(s) deleted"],!0);g[0]&&a===record&&newOrCancel();switch(g[0]){case 0:return $("td",b).css("border","thin solid darkgray"),alert(g[2]);case 1:return data_rows.splice($.inArray(a,data_rows),1),displayRows($("#slider").slider("option","max")-$("#slider").slider("value"));default:return alert("Multiple records have been deleted.\nTable will be reloaded."),location.reload(!0)}}catch(n){return c=n,$("td",b).css("border","thin solid darkgray"),displayMessage("JSON error: "+c.message,!0)}}).fail(function(a,
c){$("td",b).css("border","thin solid darkgray");return displayMessage("DELETION error: "+c,!0)}).always(function(){return $("form").prop("disabled",!1)})};return $("#safe").is(":checked")?$.post("/AJAX/Table.php","table_check="+encodeURIComponent(JSON.stringify(f))).done(function(a){try{return confirm(a+literal[" row(s) will be deleted?"])?c():($("td",b).css("border","thin solid darkgray"),$("form").prop("disabled",!1),displayMessage(filtered))}catch(g){return a=g,$("td",b).css("border","thin solid darkgray"),
displayMessage("JSON error: "+a.message,!0)}}).fail(function(a,c){$("td",b).css("border","thin solid darkgray");return displayMessage("DELETION error: "+c,!0)}):c()};
$(document).ready(function(){return $("form").submit(function(e){return $("#safe").is(":checked")&&!confirm(literal["Save record?"])?!1:$.post("/AJAX/Table.php",(null===record?"table_insert=":"table_update=")+encodeURIComponent(JSON.stringify($(this).serializeArray()))).done(function(b){var a,f,c,e,g,n,t,p;try{var l=JSON.parse(b);var u=null===record?literal[" row inserted"]:literal[" row(s) updated"];""!==l[2]&&(u+=" ( "+l[2]+" )");displayMessage(l[0]+u,!0);1<l[0]&&(alert("Multiple records have been modified.\nTable will be reloaded."),
location.reload(!0));if(1===l[0]){if(a=0<$("#title-row td div.ui-icon").length){var d=$("#title-row td div.ui-icon").parent().index();var v="number"===$("colgroup").children()[d--].className}if(null===record)var q=$("#data-table tr:first").data("index");else{if(a){var m=$("#editor-row td")[d];a=$(".selection",m).length?record.data[d]!==$(".selected",m).val():$("select",m).length?record.data[d]!==$("select option:selected",m).html():record.data[d]!==$.trim(m.firstChild.value)}q=$.inArray(record,data_rows);
data_rows.splice(q,1)}record={data:[],id:l[1],display:!1};$("#editor-row td").each(function(){if($(".selection",this).length){var a=$(".selected",this).attr("id");var b=$("#"+a);var c=$("#"+a+"-value");return""===$(b).val()?record.data.push(null):options[a][$(b).val()]?record.data.push($(b).val()):record.data.push('<span data-value="'+$(c).val()+'">'+$(b).val()+"</span>")}return $("select",this).length?record.data.push($("select option:selected",this).html()):$(this).children().first().prop("disabled")?
record.data.push(record.id[0]):record.data.push($.trim(this.firstChild.value))});filtered-=record.display;var k=[];if($("#regular").is(":checked"))for($("#filter-row input").each(function(){return k.push(new RegExp(this.value,"im"))}),d=f=0,e=k.length;f<e;d=++f){var w=k[d];if(!(record.display=w.test(record.data[d])))break}else for($("#filter-row input").each(function(){return k.push(this.value.toLowerCase())}),d=c=0,g=k.length;c<g;d=++c){w=k[d];var y=record.data[d]?record.data[d].toString().toLowerCase():
"";if(!(record.display=0<=y.indexOf(k[d])))break}filtered+=record.display;if(a){d=$("#title-row td div.ui-icon").parent().index()-1;var h=0;if($("#title-row td div.ui-icon").hasClass("ui-icon-circle-triangle-n"))if(v)for(;h<data_rows.length&&record.data[d]>data_rows[h].data[d];)h++;else for(p=null!=(n=record.data[d])?n:"";h<data_rows.length&&0<p.localeCompare(data_rows[h].data[d]);)h++;else if(v)for(;h<data_rows.length&&record.data[d]<data_rows[h].data[d];)h++;else for(p=null!=(t=record.data[d])?
t:"";h<data_rows.length&&0>p.localeCompare(data_rows[h].data[d]);)h++;h>=data_rows.length?data_rows.push(record):data_rows.splice(h,0,record)}else data_rows.splice(q,0,record);displayRows($("#slider").slider("option","max")-$("#slider").slider("value"));return newOrCancel()}}catch(x){return b=x,displayMessage("JSON error: "+b.message,!0)}}).fail(function(b,a){return displayMessage("SAVE error: "+a,!0)}).always(function(){return $("form").prop("disabled",!1)})})});//# sourceMappingURL=Table.js.map
