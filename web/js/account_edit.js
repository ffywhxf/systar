$(function(){
	$('.item[name="related"]').on('autocompleteselect',function(event,data){
		/*有自动完成结果且已选择*/
		$(this).find('[name="account[people]"]').val(data.value).trigger('change');
	})
	.on('autocompleteresponse',function(){
		/*自动完成响应*/
		$(this).find('[name="account[people]"]').val('').trigger('change');
	});
});