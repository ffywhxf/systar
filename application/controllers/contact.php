<?php
class Contact extends SS_controller{
	function __construct(){
		parent::__construct();
	}
	
	function lists(){
		$this->session->set_userdata('last_list_action',$this->input->server('REQUEST_URI'));
		$this->load->model('client_model','client');	    
		if($this->input->post('delete')){
			$contacts_to_delete=array_trim($this->input->post('contact_check'));
			$this->client->delete($contacts_to_delete);
		}
		$field=array(
			'abbreviation'=>array('title'=>'名称','content'=>'<input type="checkbox" name="contact_check[{id}]" />
			<a href="javascript:showWindow(\'contact/edit/{id}\')" title="{name}">{abbreviation}</a>',
				'td'=>'class="ellipsis"'
			),
			'work_for'=>array('title'=>'单位'),
			'position'=>array('title'=>'职务'),
			'phone'=>array('title'=>'电话','td'=>'class="ellipsis" title="{phone}"'
			),
			'address'=>array('title'=>'地址','td'=>'class="ellipsis" title="{address}"'
			),
			'comment'=>array('title'=>'备注','td'=>'class="ellipsis"','eval'=>true,'content'=>"
				return str_getSummary('{comment}',50);
			",
			)
		);
		$table=$this->table->setFields($field)
			->setMenu('<input type="submit" name="delete" value="删除" />','left')
			->wrapForm()
			->setData($this->contact->getList())
			->generate();
		$this->load->addViewData('list',$table);
		$this->load->view('list');
	}

	function add(){
		$this->edit();
	}
	
	function edit($id=NULL){
		$this->load->model('client_model','client');
		$this->load->model('cases_model','cases');
	
		$this->getPostData($id,function($CI){
			post('contact/name',$_SESSION['username'].'的新联系人 '.date('Y-m-d h:i:s',$CI->config->item('timestamp')));
			post('contact/abbreviation',$_SESSION['username'].'的新联系人 '.date('Y-m-d h:i:s',$CI->config->item('timestamp')));
		},true,'client');
		
		if($this->input->post('character')){
			post('contact/character',$this->input->post('character'));
		}
		
		$submitable=false;//可提交性，false则显示form，true则可以跳转
		
		if($this->input->post('submit')){
			$submitable=true;
		
			$_SESSION[CONTROLLER]['post']=array_replace_recursive($_SESSION[CONTROLLER]['post'],$this->input->post());
		
			if(is_posted('submit/contact_related')){
				$q_contact="SELECT id,name FROM `client` WHERE display=1 AND (`name` LIKE '%".post('contact_related_extra/name')."%' OR abbreviation LIKE '%".post('contact_related_extra/name')."%')";
				$r_contact=db_query($q_contact);
				$contacts=db_rows($r_contact);
				if($contacts<=1){
					if($contacts==0){//如果contact_related添加的联系人不存在，则先添加联系人
						$new_contact=array(
							'name'=>post('contact_related_extra/name'),
							'abbreviation'=>post('contact_related_extra/name'),
							'character'=>post('contact_related_extra/character')=='单位'?'单位':'自然人',
							'classification'=>'联系人',
							'type'=>'潜在联系人',
							'uid'=>array_dir('_SESSION/id'),
							'username'=>array_dir('_SESSION/username'),
							'time'=>$this->config->item('timestamp')
						);
						db_insert('client',$new_contact);
						$new_contact['id']=db_insert_id();
						post('contact_related/client_right',$new_contact['id']);
		
						client_addContact_phone_email(post('contact_related/client_right'),post('contact_related_extra/phone'),post('contact_related_extra/email'));
		
						showMessage('<a href="javascript:showWindow(\'contact?edit='.$new_contact['id'].'\')" target="_blank">新联系人 '.$new_contact['name'].' 已经添加，点击编辑详细信息</a>','notice');
		
					}else{
						$a_contact=mysql_fetch_array($r_contact);
						post('contact_related/client_right',$a_contact['id']);
						showMessage('系统中已经存在 '.$a_contact['name'].'，已自动识别并添加');
					}
		
					post('contact_related/client_left',post('contact/id'));
			
					db_insert('client_client',post('contact_related'));
					
					post('contact_related_extra/show_add_form',false);
					unset($_SESSION['contact']['post']['contact_related']);
					unset($_SESSION['contact']['post']['contact_related_extra']);
		
				}else{
					showMessage('此关键词存在多个符合用户','warning');
					post('contact_related_extra/show_add_form',true);
					$submitable=false;
				}
			}
			
			if(is_posted('submit/contact_contact')){
				post('contact_contact/client',post('contact/id'));
				
				if(db_insert('client_contact',post('contact_contact'))){
					unset($_SESSION['client']['post']['contact_contact']);
				}else{
					showMessage('数据插入错误，请检查格式','warning');
				}
			}
			
			if(is_posted('submit/contact_related_delete')){
		
				$condition = db_implode(post('contact_related_check'), $glue = ' OR ','id','=',"'","'", '`','key');
		
				$q="DELETE FROM client_client WHERE (".$condition.")";
		
				db_query($q);
			}
		
			if(is_posted('submit/contact_contact_delete')){
		
				$condition = db_implode(post('contact_contact_check'), $glue = ' OR ','id','=',"'","'", '`','key');
		
				$q="DELETE FROM client_contact WHERE (".$condition.")";
		
				db_query($q);
			}
		
			if(post('contact/character')=='自然人'){
				//自然人简称就是名称
				post('contact/abbreviation',post('contact/name'));
		
			}elseif(post('contact/abbreviation')==''){
				//单位简称必填
				$submitable=false;
				showMessage('请填写联系人简称','warning');
			}
			
			$this->processSubmit($submitable,NULL,'client');
		}
		
		//准备contact_add表单中的小表
		$fields_contact_related=array(
			'checkbox'=>array('title'=>'<input type="submit" name="submit[contact_related_delete]" value="删" />','orderby'=>false,'content'=>'<input type="checkbox" name="contact_related_check[{id}]" >','td_title'=>' width=60px'),
			'client_right_name'=>array('title'=>'名称','eval'=>true,'content'=>"
				return '<a href=\"javascript:showWindow(\''.('{classification}'=='客户'?'client':'contact').'?edit={client_right}\')\">{client_right_name}</a>';
			",'orderby'=>false),
			'client_right_phone'=>array('title'=>'电话','orderby'=>false),
			'client_right_email'=>array('title'=>'电邮','wrap'=>array('mark'=>'a','href'=>'mailto:{client_right_email}')),
			'role'=>array('title'=>'关系','orderby'=>false)
		);
		$this->load->view_data['contact_related']=$this->table->setFields($fields_contact_related)
				->generate($this->client->getRelatedClients(post('contact/id')));
		
		$fields_contact_contact=array(
			'checkbox'=>array('title'=>'<input type="submit" name="submit[contact_contact_delete]" value="删" />','orderby'=>false,'content'=>'<input type="checkbox" name="contact_contact_check[{id}]" >','td_title'=>' width=60px'),
			'type'=>array('title'=>'类别','orderby'=>false),
			'content'=>array('title'=>'内容','orderby'=>false),
			'comment'=>array('title'=>'备注','orderby'=>false)
		);
		$this->load->view_data['contact_contact']=$this->table->setFields($fields_contact_contact)
				->generate($this->client->getContacts(post('contact/id')));
		
		$fields_contact_case=array(
			'num'=>array('title'=>'案号','wrap'=>array('mark'=>'a','href'=>'javascript:window.rootOpener.location.href=\'case?edit={id}\';window.opener.parent.focus();'),'orderby'=>false),
			'case_name'=>array('title'=>'案名','orderby'=>false),
			'lawyers'=>array('title'=>'主办律师','orderby'=>false)
		);
		$this->load->view_data['contact_case']=$this->table->setFields($fields_contact_case)
				->generate($this->cases->getListByClient(post('contact/id')));
		
		if(post('contact/character')=='单位'){
			$this->load->view('contact/add_artificial');
		
		}else{
			$this->load->view('contact/add_natural');
		}
		$this->load->main_view_loaded=true;
	}
}
?>