var hash,controller,action,username,sysname,uriSegments;

$(window).on('hashchange',function(){
	hash=$.locationHash();

	uriSegments=hash.split('/');
	
	/*根据当前hash，设置标签选项卡和导航菜单激活状态*/
	$('#tabs>[for="'+hash+'"]').addClass('activated');
	$('#tabs>:not([for="'+hash+'"])').removeClass('activated');

	$('nav li').removeClass('activated');
	$('nav li#nav-'+uriSegments[0]+', nav li#nav-'+uriSegments[0]+'-'+uriSegments[1]).addClass('activated');

	/*
	 *根据当前hash，显示对应标签页面，隐藏其他页面。
	 *如果当前page中没有请求的页面（或者已过期），那么向服务器发送请求，获取新的页面并添加标签选项卡。
	 */
	if($('#page>section[hash="'+hash+'"]').length>0){
		$('#page>section[hash!="'+hash+'"]').hide();
		$('#side-bar>aside[for!="'+hash+'"]').hide();
	
		$('#page>section[hash="'+hash+'"]').show().attr('time-access',$.now()).trigger('sectionshow');
		$('#side-bar>aside[for="'+hash+'"]').show().trigger('sidebarshow');
		
	}else{
		$('#top-bar>.throbber').fadeIn(500).rotate({animateTo:18000,duration:100000});
		
		$.get(hash,function(response){
			
			$('#top-bar>.throbber').stop().fadeOut(200).stopRotate();
			
			$('#page>section[hash!="'+hash+'"]').hide();
			$('#side-bar>aside[for!="'+hash+'"]').hide();

			/*如果需要redirect，则在构造<section>等元素前return掉*/
			if(response.status==='redirect'){
				$.locationHash(response.data);
				return;
			}
	
			$('<section hash="'+hash+'" time-access="'+$.now()+'"></section>').appendTo('#page');
			$('<aside for="'+hash+'"></aside>').appendTo('#side-bar');
			
			/*如果请求的hash在导航菜单中不存在，则生成标签选项卡*/
			if($('nav a[href="#'+hash+'"]').length===0 && response.data.name){
				$('#tabs').append('<li for="'+hash+'" class="activated"><a href="#'+hash+'">'+response.data.name.content+'</a></li>');
			}
			
			$(document).setBlock(response);
	
		},'json');
	}
	
});

$(document).ready(function(){
	
	if($.browser.msie && ($.browser.version<8 || document.documentMode && document.documentMode<8)){
		$.showMessage('您正在使用不被推荐的浏览器，请关闭浏览器兼容模式。如果问题仍然存在，<a href="/browser">请点此下载推荐的浏览器</a>','warning');
	}
	
	/*导航栏配置*/
	$('#navMenu>.l0>li>a,controller').click(function(){
		$(this).parent().children('ul:hidden').show();
		$(this).siblings('.arrow').children('img').rotate({animateTo:90,duration:200});
	});
	$('#navMenu>.l0>li>.arrow').click(function(){
		var subMenu=$(this).siblings('.l1');
		if(subMenu.is(':hidden')){
			subMenu.show(200);
			$(this).children('img').rotate({animateTo:90,duration:500});
		}else{
			$(this).children('img').rotate({animateTo:0,duration:500});
			subMenu.hide(200);
		}
	});
	
	/*为主体载入指定页面或默认页面*/
	if(window.location.hash){
		$(window).trigger('hashchange');
	}else if($('#page').attr('default-uri')){
 		$.locationHash($('#page').attr('default-uri'));
 	}
	
	$('body').trigger('sectionload');
})
/*手动刷新*/
.on('click','a[href^="#"]',function(){
	if($(this).attr('href').substr(1)===hash){
		$('#top-bar>.throbber').fadeIn(500).rotate({animateTo:18000,duration:100000});
		$.get(hash,function(response){
			$('#top-bar>.throbber').stop().fadeOut(200).stopRotate();
			$(document).setBlock(response);
		},'json');
	}
})
/*主体页面加载事件*/
.on('blockload','*',function(event){
	/*section触发事件后不再传递到body*/
	event.stopPropagation();
	
	$(this).find('[placeholder]').placeholder();
	$(this).find('.date').datepicker();
	$(this).find('.birthday').datepicker({
		changeMonth: true,
		changeYear: true
	});
	
	$(this).find('.contentTable>tbody>tr:has(td:first[hash])').css({cursor:'pointer'});

	if(!$.browser.msie){
		$(this).find('.contentTable>tbody>tr').each(function(index){
			$(this).delay(15*index).css('opacity',0).css('visibility','visible').animate({opacity:'1'},500);
		});
	}
})
.on('sectionload sectionshow','#page>section',function(){
	document.title=affair+' - '+(username?username+' - ':'')+sysname;
})
/*编辑页的提交按钮点击事件，提交数据到后台，在页面上反馈数据和提示*/
.on('click','#page>section>form input:submit, #page>section>form button:submit',function(){
	var section = $(this).closest('section');
	var form = section.children('form');
	
	var id = section.find('form[name="'+controller+'"]').attr('id');
	var submit = $(this).attr('name').replace('submit[','').replace(']','');
	
	var postURI='/'+controller+'/submit/'+submit;
	
	if(id){
		postURI+='/'+id;
	}
	
	form.ajaxForm({url:postURI,dataType:'json',success:function(response){
		
		if($.browser.msie){
			$.showMessage('您正使用IE浏览器，如果按下按钮后，页面没有反应，或者显示不正常，那是正常现象。重新点击本页标签刷新即可');
		}
		
		$('#page>section[hash="'+hash+'"]').setBlock(response);

		if(response.status==='success'){
			if(submit===controller || submit==='cancel'){
				$('#tabs>li[for="'+hash+'"]').remove();
				$('#page>section[hash="'+hash+'"]').remove();

				var lastAccessedHash;
				var lastAccessTime=0;
				
				var sections = $('#page>section').each(function(){
					if($(this).attr('time-access')>lastAccessTime){
						lastAccessedHash=$(this).attr('hash');
						lastAccessTime=$(this).attr('time-access');
					}
				}).length;
				
				if(sections>0){
					$.locationHash(lastAccessedHash);
				}else{
					$.locationHash($('#page').attr('default-uri'));
				}
			}
		}

	}});
	
	/*$.post(postURI,$('#page>section[hash="'+hash+'"]>form').serialize(),function(response){
	},'json');*/

	//return false;
})
/*边栏提交按钮的点击事件*/
.on('click','#side-bar>aside input:submit',function(){

	$.post($(this).closest('aside').attr('for'),$(this).closest('form').serialize()+'&submit='+$(this).attr('name'),function(response){
		$(document).setBlock(response);
	},'json');
	
	return false;
})
/*分页按钮响应*/
.on('click','.pagination button',function(){
	
	$('#top-bar>.throbber').fadeIn(500).rotate({animateTo:18000,duration:100000});

	$.post('/'+hash,{start:$(this).attr('target-page-start')},function(response){
		$('#top-bar>.throbber').stop().fadeOut(200).stopRotate();
		$(document).setBlock(response);
	},'json');
	
	return false;
})
/*edit表单元素更改时实时提交到后台 */
.on('change','#page>section>form:[id] :input',function(){
	var value=$(this).val();
	if($(this).is(':checkbox') && !$(this).is(':checked')){
		value=0;
	}
	var id = $('#page>section[hash="'+hash+'"]>form').attr('id');
	var name = $(this).attr('name').replace('[','/').replace(']','');
	var data={};data[name]=value;
	
	if(controller && id){
		$.post('/'+controller+'/setfields/'+id,data);
	}
})
/*边栏选框自动提交*/
.on('change','select.filter[method!="get"]',function(){
	post($(this).attr('name'),$(this).val());
})
/*边栏选框自动提交*/
.on('change','select.filter[method="get"]',function(){
	redirectPara($(this));
})
/*自动完成*/
.on('focus','[autocomplete-model]',function(){
	var autocompleteModel=$(this).attr('autocomplete-model');
	$(this).autocomplete({
		source: function(request, response){
			$.post('/'+autocompleteModel+'/match',{term:request.term},function(responseJSON){
				response(responseJSON.data);
			},'json');
		},
		select: function(event,ui){
			$(this).val(ui.item.label).trigger('autocompleteselect',{value:ui.item.value}).trigger('change');
			return false;
		},
		focus: function(event,ui){
			//$(this).val(ui.item.label);
			return false;
		},
		response: function(event,ui){
			if(ui.content.length===0){
				$(this).trigger('autocompletenoresult');
			}
			//$(this).trigger('change');
		}
	})
	/*.bind('input.autocomplete', function(){
		//修正firefox下中文不自动search的bug
		$(this).trigger('keydown.autocomplete'); 
	})*/
	//.autocomplete('search')
	;
})
//响应每一栏标题上的"+"并显示/隐藏添加菜单
.on('click','.item>.title>.toggle-add-form',function(){
	var addForm=$(this).closest('.item').find('.add-form');
	if(addForm.is(':hidden')){
		addForm.show(200);
		$(this).html('-');
	}else{
		addForm.hide(200);
		$(this).html('+');
	}
})
.on('enable','[display-for]:not([locked-by])',function(){
	$(this).find(':input:disabled:not([locked-by])').trigger('change').removeAttr('disabled');
	$(this).show();

})
.on('disable','[display-for]:not([locked-by])',function(){
	$(this).hide();
	$(this).find(':input:enabled').trigger('change').attr('disabled','disabled');

}).on('mouseenter mouseleave','.contentTable>tbody>tr',function(){
	$(this).toggleClass('highlighted');

}).on('click','.contentTable>tbody>tr:has(td:first[hash])',function(){
	$.locationHash($(this).children('td:first').attr('hash'));

}).on('click','.contentTable>tbody a, .contentTable :input',function(event){
	event.stopPropagation();

});

function changeURLPar(url,par,par_value){
	//为url添加/更改变量名和值，并返回

	var pattern = '[^&^?]*'+par+'=[^&]*';
	var replaceText = par+'='+par_value;
	
	if (url.match(pattern)){
		return url.replace(url.match(pattern), replaceText);
	}else{
		if (url.match('[\?]')){
			return url+'&'+ replaceText;
		}else{
			return url+'?'+replaceText;
		}
	}

	return url+'\n'+par+'\n'+par_value;
}

function unsetURLPar(url,par){
	//删除url中的指定变量，并返回
	var regUnsetPara=new RegExp('\\?'+par+'$|\\?'+par+'=[^&]*$|'+par+'=[^&]*\\&*|'+par+'&|'+par+'$');
	return url.replace(regUnsetPara,'');
}

/*扩展jQuery工具函数库*/
jQuery.showMessage=function(message,type,directExport){
	if(!directExport){
		var directExport=false;
	}

	if(directExport){
		var newMessage=$(message);
	}else{
		if(type==='warning'){
			var notice_class='ui-state-error';
			var notice_symbol='<span class="ui-icon ui-icon-info" style="float: left; margin-right: .3em;"></span>';
		}else{
			var notice_class='ui-state-highlight';
			var notice_symbol='<span class="ui-icon ui-icon-alert" style="float: left; margin-right: .3em;"></span>';
		}
		var newMessage = $('<span class="message ui-corner-all ' + notice_class + '" title="点击隐藏提示">' + notice_symbol + message + '</span>');
	}

	newMessage.appendTo('body');
	
	$.processMessage();

};

jQuery.processMessage=function(){
	var noticeEdge=50;
	var lastNoticeHeight=0;
	$('.message').each(function(index,element){
		$(this).css('top',noticeEdge+lastNoticeHeight+'px');
		lastNoticeHeight+=$(this).height()+30;
	});

	$('.message').click(function(){
		$(this).stop(true).fadeOut(200,function(){
			$(this).remove();
			$.processMessage();
		});
	}).each(function(index,Element){
		$(this).delay(index*3000).fadeOut(20000,function(){
			$(this).remove();
		});
	}).mouseenter(function(){
		$(this).stop(true).dequeue().css('opacity',1);
	}).mouseout(function(){
		$(this).fadeOut(10000);
	});
};

jQuery.parseMessage=function(messages){
	if(messages){
		$.each(messages,function(messageType,messages){
			$.each(messages,function(index,message){
				$.showMessage(message,messageType);
			});
		});
	}
};

/*扩展jQuery对象函数*/
jQuery.fn.getOptionsByLabelRelative=function(labelName,callback){
	var select=$(this);
	
	$.get('/label/getrelatives/'+labelName,function(response){
		var options='';
		$.map(response.data,function(item){
			options+='<option value="'+item+'">'+item+'</option>';
		});
		select.html(options).trigger('change');
		if (typeof callback !== 'undefined'){
			callback(passive_select.val());
		}
	},'json');
};

/**
 *根据一个后台返回的响应
 *（包含status, message, data属性. 其中，data为多个如下结构的对象type, content, selector, method）
 *中包含的信息，对当前页面进行部分再渲染
 *
 */
jQuery.fn.setBlock=function(response){
	
	var parent=this;
	
	if(response.status==='login_required'){
		window.location.href='login';
		return this;
	}

	else if(response.status==='redirect'){
		$.locationHash(response.data);
		return this;
	}
	
	else if(response.status==='refresh'){
		$.get(hash,function(response){
			$(document).setBlock(response);
		});
	}
	
	$.parseMessage(response.message);
	
	$.each(response.data,function(dataName,data){
		
		if(data.type==='script'){
			eval(data.content);
		}
		
		else if(data.method==='replace'){
			if(data.selector){
				if(parent.is(data.selector)){
					parent.replaceWith(data.content);
					parent.trigger('blockload');
				}else{
					parent.find(data.selector).replaceWith(data.content);
					parent.find(data.selector).trigger('blockload');
				}
			}
		}else{
			if(data.selector){
				
				var block;
				
				if(parent.is(data.selector)){
					if(data.method==='append'){
						block=parent.append(data.content).trigger('blockload');
					}else{
						block=parent.html(data.content).trigger('blockload');
					}
				}else{
					if(data.method==='append'){
						block=parent.find(data.selector).append(data.content).trigger('blockload');
					}else{
						block=parent.find(data.selector).html(data.content).trigger('blockload');
					}
				}				
				
				/*如果数据是主页面内容，则标记载入时间，触发特定事件*/
				if(dataName==='content'){
					block.trigger('sectionload').attr('time-load',$.now());
				}
			}
		}
	});
	
	return this;
};