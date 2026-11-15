(function(root){
  let active=false;
  async function request(action,doc=document){
    if(!action?.requireConfirmation)return true;
    if(active)return false;
    active=true;
    return new Promise(resolve=>{
      const previous=doc.activeElement,dialog=doc.createElement('dialog');dialog.className='action-confirmation';
      const title=doc.createElement('h3');title.textContent='Confirm action';title.id='actionConfirmationTitle';dialog.setAttribute('aria-labelledby',title.id);
      const message=doc.createElement('p');message.textContent=String(action.confirmationMessage||'').trim()||'Are you sure?';message.id='actionConfirmationMessage';dialog.setAttribute('aria-describedby',message.id);
      const buttons=doc.createElement('div');buttons.className='prop-inline';
      const cancel=doc.createElement('button');cancel.type='button';cancel.textContent='Cancel';cancel.className='panel-btn';
      const confirm=doc.createElement('button');confirm.type='button';confirm.textContent='Confirm';confirm.className='panel-btn';
      const finish=value=>{if(!active)return;active=false;dialog.close();dialog.remove();previous?.focus?.();resolve(value);};
      cancel.addEventListener('click',()=>finish(false));confirm.addEventListener('click',()=>finish(true));
      dialog.addEventListener('cancel',event=>{event.preventDefault();finish(false);});
      buttons.append(cancel,confirm);dialog.append(title,message,buttons);doc.body.appendChild(dialog);dialog.showModal();cancel.focus();
    });
  }
  const api={request};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.HmiActionConfirmation=api;
})(globalThis);
