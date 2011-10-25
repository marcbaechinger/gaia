
// Based on Resig's pretty date
function prettyDate(time) {
  var diff = (Date.now() - time) / 1000;
  var day_diff = Math.floor(diff / 86400);
      
  if (isNaN(day_diff) || day_diff < 0 || day_diff >= 31)
    return '';
      
  return day_diff == 0 && (
          diff < 60 && 'just now' ||
          diff < 120 && '1 minute ago' ||
          diff < 3600 && Math.floor( diff / 60 ) + ' minutes ago' ||
          diff < 7200 && '1 hour ago' ||
          diff < 86400 && Math.floor( diff / 3600 ) + ' hours ago') ||
          day_diff == 1 && 'Yesterday' ||
          day_diff < 7 && day_diff + ' days ago' ||
          day_diff < 31 && Math.ceil( day_diff / 7 ) + ' weeks ago';
};

var MessageManager = {
  getMessages: function mm_getMessages(callback, filter, invert) {
    var request = navigator.mozSms.getMessages(filter, !invert);

    var messages = [];
    request.onsuccess = function() {
      var result = request.result;
      if (!result) {
        callback(messages);
        return;
      }
              
      var message = result.message;
      messages.push(message);
      result.next();
    };

    request.onerror = function() {
      alert('Something wrong has happened while reading the database. Error code: ' + request.errorCode);
    }
  },

  send: function mm_send(number, text, callback) {
    var result = navigator.mozSms.send(number, text);
    result.onsuccess = callback;
    result.onerror = callback;
  },

  delete: function mm_delete(id) {
    navigator.mozSms.delete(id);
  }
};

if (!('mozSms' in navigator)) {
  MessageManager.messages = [];

  MessageManager.getMessages = function mm_getMessages(callback, filter, invert) {
    function applyFilter(msgs) {
      if (!filter)
        return msgs;

      if (filter.number) {
        msgs = msgs.filter(function(element, index, array) {
            return (filter.number && (filter.number == element.sender ||
                    filter.number == element.receiver));
        });
      }

      return msgs;
    }

    if (this.messages.length) {
      var msg = this.messages.slice();
      if (invert)
        msg.reverse();
      callback(applyFilter(msg));
      return;
    }

    var messages = [
      {
        sender: null,
        receiver: 'Mounir',
        body: 'Nothing :)',
        timestamp: Date.now() - 44000000,
      },
      {
        sender: 'Mounir',
        body: 'Hey! What\s up?',
        timestamp: Date.now() - 50000000,
      }
    ];

    for (var i = 0; i < 40; i++)
      messages.push({
        sender: 'Vivien',
        body: 'Hello world!',
        timestamp: Date.now() - 60000000,
      });

    this.messages = messages;

    var msg = this.messages.slice();
    if (invert)
      msg.reverse();
    callback(applyFilter(msg));
  }

  MessageManager.send = function mm_send(number, text, callback) {
    var message = {
      sender: null,
      receiver: number,
      body: text,
      timestamp: Date.now()
    } 
    var event = document.createEvent('CustomEvent');
    event.initCustomEvent('smssent', true, false, message);
    var windows = window.top.document.getElementById('windows');
    parentWindow = windows.lastChild.previousSibling.contentWindow;
    setTimeout(function(evt) {
      parentWindow.dispatchEvent(event);
      window.dispatchEvent(event);
      callback();
    }, 1000);
  }

  MessageManager.handleEvent = function handleEvent(evt) {
    this.messages.unshift(evt.detail);
  }

  window.addEventListener('smssent', MessageManager, true);
  window.addEventListener('smsreceived', MessageManager, true);
};


var MessageView = {
  init: function init() {
    this.showConversations();

    var view = this.view;
    view.addEventListener('touchstart', this, true);
    view.addEventListener('mousedown', this, true);
    window.addEventListener('touchmove', this, true);
    window.addEventListener('mousemove', this, true);
    window.addEventListener('touchend', this, true);
    window.addEventListener('mouseup', this, true);
    window.addEventListener('smsreceived', this, true);
    window.addEventListener('smssent', this, true);
  },

  get conversationView() {
    delete this.conversationView;
    return this.conversationView = document.getElementById('conversation');
  },

  openConversationView: function openConversationView(num) {
    var url = 'sms/sms_conversation.html';
    if (num)
      url += '?' + num;
    window.top.openApplication(url);
  },

  get view() {
    delete this.view;
    return this.view = document.getElementById('messages');
  },

  showConversations: function showConversations() {
    var self = this;
    MessageManager.getMessages(function(messages) {
      var conversations = {};
      for (var i = 0; i < messages.length; i++) {
        var message = messages[i];
        var sender = message.sender || message.receiver;
        if (conversations[sender]) {
          conversations[sender].count++;
          continue;
        }

        conversations[sender] = {
          sender: message.sender,
          receiver: message.receiver,
          body: message.body,
          timestamp: prettyDate(message.timestamp),
          count: 1
        }
      }

      while (self.view.childNodes.length > 2)
        self.view.removeChild(self.view.lastChild);

      var fragment = document.createDocumentFragment();
      for (var conversation in conversations) {
        var msg = self.createNewMessage(conversations[conversation]);
        fragment.appendChild(msg);
      }
      self.view.appendChild(fragment);
    }, null);
  },

  createNewMessage: function createNewMessage(message) {
    var container = document.createElement('div');
    container.className = 'message sender';

    var content = document.createElement('div');
    content.className = 'sms';

    var contact = document.createElement('div');
    var num = message.sender;
    if (!num) {
      num = message.receiver;
      container.className = 'message receiver';
    }
    container.setAttribute('num', num);

    container.onclick = function (evt) {
      MessageView.openConversationView(evt.target.getAttribute('num'));
    };

    var title = num + ' (' + message.count + ')';
    contact.appendChild(document.createTextNode(title));
    contact.className = 'title';
    content.appendChild(contact);
        
    var sms = document.createElement('div');
    sms.className = 'content';

    var text = document.createElement('span');
    text.appendChild(document.createTextNode(message.body));
    text.className = 'text';
    sms.appendChild(text);

    var infos = document.createElement('span');
    infos.appendChild(document.createTextNode(message.timestamp));
    infos.className = 'infos';
    sms.appendChild(infos);
    content.appendChild(sms);

    container.appendChild(content);
    return container;
  },

  onTouchStart: function onTouchStart(evt) {
    this.start = evt.pageY;
    this.panning = true;
    this.view.setAttribute('panning', 'true');
  },

  onTouchMove: function onTouchMove(evt) {
    if (!this.panning)
      return;

    var offset = evt.pageY - this.start;
    this.start = evt.pageY;
    this.view.scrollTop -= offset;
  },

  onTouchEnd: function onTouchEnd(evt) {
    if (!this.panning)
      return;

    var offset = evt.pageY - this.start;
    this.view.scrollTop -= offset;
    this.panning = false;
    this.view.removeAttribute('panning');
  },

  handleEvent: function handleEvent(evt) {
    switch (evt.type) {
      case 'touchstart':
        event.preventDefault();
      case 'mousedown':
        this.onTouchStart(evt.touches ? evt.touches[0] : evt);
        break;
      case 'touchmove':
        event.preventDefault();
      case 'mousemove':
        this.onTouchMove(evt.touches ? evt.touches[0] : evt);
        break;
      case 'touchend':
        event.preventDefault();
      case 'mouseup':
        this.onTouchEnd(evt.touches ? evt.touches[0] : evt);
        break;
      case 'smssent':
      case 'smsreceived':
        setTimeout(function(self) {
          self.showConversations();
        }, 800, this);
        break;
    }
  }
};

var ConversationView = {
  get view() {
    delete this.view;
    return this.view = document.getElementById('conversation');
  },

  get filter() {
    delete this.filter;
    return this.filter = document.location.toString().split('?')[1] || null;
  },

  init: function cv_init() {
    window.addEventListener('smssent', this, true);
    window.addEventListener('smsreceived', this, true);
    this.view.addEventListener('touchstart', this, true);
    this.view.addEventListener('mousedown', this, true);
    window.addEventListener('touchmove', this, true);
    window.addEventListener('mousemove', this, true);
    window.addEventListener('touchend', this, true);
    window.addEventListener('mouseup', this, true);

    this.showConversation();
  },

  showConversation: function cv_showConversation() {
    if (!this.filter)
      return;

    var view = this.view;
    var filter = ('SmsFilter' in window) ? new SmsFilter() : {};
    filter.number = this.filter;

    MessageManager.getMessages(function (messages) {
      var fragment = document.createDocumentFragment();
      for (var i = 0; i < messages.length; i++) {
        var message = messages[i];
        var container = document.createElement('div');
        container.className = 'message sender';
        var uuid = message.hasOwnProperty('uuid') ? message.uuid : '';
        container.setAttribute('data-id', uuid);
        container.onclick = function(evt) {
          var id = evt.target.getAttribute('data-id');
          MessageManager.delete(id);
          ConversationView.showConversation();
        }

        var arrow = document.createElement('div');
        arrow.className = 'arrow-left';
        container.appendChild(arrow);

        var contact = document.createElement('div');
        var num = message.sender;
        if (!num) {
          num = message.receiver;
          container.className = 'message receiver';
        }
        container.setAttribute('num', num);

        var text = document.createElement('span');
        text.appendChild(document.createTextNode(message.body));
        text.className = 'text';
        container.appendChild(text);

        var infos = document.createElement('span');
        infos.appendChild(document.createTextNode(prettyDate(message.timestamp)));
        infos.className = 'infos';
        container.appendChild(infos);
        fragment.appendChild(container);
      }
          
      while (view.childNodes.length > 2)
        view.removeChild(view.lastChild);

      view.appendChild(fragment);
      setTimeout(function() {
        view.scrollTop = view.scrollHeight;
      }, 0);
    }, filter, true);
  },

  onTouchStart: function onTouchStart(evt) {
    this.start = evt.pageY;
    this.panning = true;
    this.view.setAttribute('panning', 'true');
  },

  onTouchMove: function onTouchMove(evt) {
    if (!this.panning)
      return;

    var offset = evt.pageY - this.start;
    this.start = evt.pageY;
    this.view.scrollTop -= offset;
  },

  onTouchEnd: function onTouchEnd(evt) {
    if (!this.panning)
      return;

    var offset = evt.pageY - this.start;
    this.view.scrollTop -= offset;
    this.panning = false;
    this.view.removeAttribute('panning');
  },

  handleEvent: function handleEvent(evt) {
    switch (evt.type) {
      case 'touchstart':
        event.preventDefault();
      case 'mousedown':
        this.onTouchStart(evt.touches ? evt.touches[0] : evt);
        break;
      case 'touchmove':
        event.preventDefault();
      case 'mousemove':
        this.onTouchMove(evt.touches ? evt.touches[0] : evt);
        break;
      case 'touchend':
        event.preventDefault();
      case 'mouseup':
        this.onTouchEnd(evt.touches ? evt.touches[0] : evt);
        break;
      case 'smssent':
      case 'smsreceived':
        setTimeout(function(self) {
          self.showConversation();
        }, 800, this);
        break;
    }
  }
};

