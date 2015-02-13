define([
  'require',
  './helpers',
  'i18n!./nls/strings',
  'text!compiled/css/main.css',
  'rv!templates/index'
], function(require, helpers, strings, css, template ) {

  var Ractive = require("Ractive");
  if( css ) {
    helpers.addCssToDocument(css);
  }

  /** PRE-PRODUCTION **/
  /*var DAREYOO_API_URL = 'http://dareyoo-pre.herokuapp.com/api/v1';
  var DAREYOO_LOGIN_URL = 'http://dareyoo-pre.herokuapp.com/oauth2/access_token';
  var DAREYOO_API_ID = '8a9d297071509a1aa10c';
  var DAREYOO_API_SECRET = 'd9a9eae1f27dc20fc754d13cb5012d9d54120636';*/

  /** LOCAL **/
  /*var DAREYOO_API_URL = 'http://dareyoo.dev:8000/api/v1';
  var DAREYOO_LOGIN_URL = 'http://dareyoo.dev:8000/oauth2/access_token';
  var DAREYOO_API_ID = '3cbaf99470699751ce96';
  var DAREYOO_API_SECRET = 'badfc6a14c8b3a0137db589068a2ed316d2ffefd';*/

  /** PRODUCTION **/
  var DAREYOO_API_URL = 'https://www.dareyoo.com/api/v1';
  var DAREYOO_LOGIN_URL = 'https://www.dareyoo.com/oauth2/access_token';
  var DAREYOO_API_ID = '325bcfda582a97a53df1';
  var DAREYOO_API_SECRET = '1fbab8a110eedf983cfd327c5a0bab61784d2423';
  var WIDGET_NAME = 'generic';

  
  return function(opts) {
    var access_token = "";
    var widget = null;
    var user = null;
    var bet = null;
    var bid = null;
    var interaction_sent = false;
    WIDGET_NAME = opts.config.name;

    var request_token = function(email, pwd, callback) {
      var post_data = 'client_id=' + DAREYOO_API_ID + '&' +
        'client_secret=' + DAREYOO_API_SECRET + '&' +
        'grant_type=password&' +
        'username=' + encodeURIComponent(email) + '&' +
        'password=' + encodeURIComponent(pwd) + '&' +
        'scope=write';
      xhr = new XMLHttpRequest();
      xhr.open('post', DAREYOO_LOGIN_URL);
      xhr.onload = callback;
      xhr.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
      xhr.send(post_data);
    };

    var api = function(endpoint, data, callback) {
      var api_url = DAREYOO_API_URL + endpoint + "?format=json";
      xhr = new XMLHttpRequest();
      var method = 'get';
      var send = "";
      if (data) {
        method = 'post';
        send = JSON.stringify(data);
      }
      xhr.open(method, api_url);
      xhr.setRequestHeader("Content-Type", "application/json");
      if(access_token)
        xhr.setRequestHeader("Authorization", "Bearer " + access_token);
      xhr.onload = callback;
      xhr.send(send);
    };

    var APISendImpression = function(callback) {
      api("/widget_activation/" + WIDGET_NAME + "/impression/", {}, callback);
    };

    var APISendInteraction = function() {
      view.set({initial_call_to_action: false});
      if(!interaction_sent) {
        interaction_sent = true;
        api("/widget_activation/" + WIDGET_NAME + "/interaction/", {bet_id:bet.id});
      }
    };

    var APISendParticipate = function() {
      api("/widget_activation/" + WIDGET_NAME + "/participate/", {bet_id:bet.id, result: view.get('result')});
    };

    var APISendRegister = function() {
      api("/widget_activation/" + WIDGET_NAME + "/register/", {bet_id:bet.id});
    };

    var APISendLogin = function() {
      api("/widget_activation/" + WIDGET_NAME + "/login/", {bet_id:bet.id});
    };

    var APISendShare = function(medium) {
      api("/widget_activation/" + WIDGET_NAME + "/share/", {bet_id:bet.id, medium:medium});
    };

    var APISendBannerClick = function(banner) {
      api("/widget_activation/" + WIDGET_NAME + "/banner/", {bet_id:bet.id, banner:banner});
    };

    var onApostarClick = function() {
      if(!view.get('loading')) {
        APISendInteraction();
        APISendParticipate();
        var r = view.get('result');
        var r1 = parseInt(view.get('result1'));
        var r2 = parseInt(view.get('result2'));
        if(bet.lottery_type && bet.lottery_type.indexOf("result") != -1) {
          if(isNaN(r1) || r1 < 0) {
            view.set({error_result1: true});
            return;
          }
          if(isNaN(r2) || r2 < 0) {
            view.set({error_result2: true});
            return;
          }
          view.set({result: r1 + " - " + r2});
        } else {
          if(!r) {
            view.set({error_generic: true});
            return;
          }
        }
        if(access_token) {
          view.set({loading:true});
          postBid();
          APISendLogin();
        } else {
          view.set({participate:false, register:true});
        }
      }
    };

    var onResultClick = function(event) {
      view.set({result:bet.bids[event.index.i].title});
    };

    var onTwitterClick = function(event) {
      APISendShare('twitter');
      var text = "He apostado por " + view.get('result') + " en la porra @solobasket sobre el %23AllStar2015 (vía @dareyooApp)";
      //var text = "He apostado por " + view.get('result') + " en la porra @sport del @FCBarcelona_es (vía @dareyooApp)";
      var url = "http://www.dareyoo.com/app/main/bet/" + bet.id + "?utm_source=referal&utm_medium=sport&utm_campaign=widgetsport";
      window.open('http://twitter.com/share?text=' + text + '&url=' + url,'_blank');
    };

    var onFacebookClick = function(event) {
      APISendShare('facebook');
      var url = "http://www.dareyoo.com/app/main/bet/" + bet.id + "?utm_source=referal&utm_medium=sport&utm_campaign=widgetsport";
      var fbpopup = window.open("https://www.facebook.com/sharer/sharer.php?u=" + url, "pop", "width=600, height=400, scrollbars=no");
    };

    var onHeaderClick = function(event) {
      APISendBannerClick('header');
      window.open(widget.header_link,'_blank');
    };

    var onFooterClick = function(event) {
      APISendBannerClick('footer');
      window.open(widget.footer_link,'_blank');
    };

    var onErrorClick = function(event) {
      view.set({error:false});
    };

    var onRegisterClick = function() {
      if(!view.get('loading')) {
        var register_data = {
          email: view.get('email'),
          password: view.get('password'),
          password2: view.get('password'),
          client_id: DAREYOO_API_ID,
          widget: WIDGET_NAME
        };
        api("/register/", register_data, onRegisterComplete);
        view.set({loading:true});
      }
    };

    var onRegisterComplete = function(event) {
      if(event.target.status == 200) {
        var register_resp = JSON.parse(event.target.responseText);
        access_token = register_resp.access_token;
        postBid();
        APISendRegister();
      } else {
        request_token(view.get('email'), view.get('password'), function(event){
          if(event.target.status == 200) {
            var data = JSON.parse(event.target.responseText);
            access_token = data.access_token;
            if(typeof(Storage) !== "undefined") {
              localStorage.setItem("dareyoo_access_token", data.access_token);
            }
            postBid();
            APISendLogin();
          } else {
            view.set({loading:false, error:true, error_msg: "Hay un error en el email o contraseña.<br><br>Por favor, revísalos o recupera tu contraseña <a href='http://www.dareyoo.com/recover/' target='_blank'>aquí</a>"});
          }
        });
      }
      
    };

    var postBid = function() {
      var result = view.get('result');
      for (var i = bet.bids.length - 1; i >= 0 && !bid; i--) {
        if(bet.bids[i].title == result)
          bid = bet.bids[i];
      };
      if(bid) {
        api("/bids/" + bid.id + "/add_participant/", {}, onBidComplete);
      } else {
        api("/bets/" + bet.id + "/bids/", { title:result }, function(event) {
          bid = JSON.parse(event.target.responseText);
          api("/bids/" + bid.id + "/add_participant/", {}, onBidComplete);
        });
      }
    };

    var onBidComplete = function(event) {
      view.set({loading:false});
      if(event.target.status == 201) {
        view.set({participate:false, register:false, share:true});
      } else {
        var message = JSON.parse(event.currentTarget.responseText).detail;
        if(message.indexOf("more than") != -1) {
          view.set({error: true, error_msg: "Parece que ya has participado en esta apuesta."});
        } else if(message.indexOf("enough") != -1) {
          view.set({error: true, error_msg: "Parece que te has quedado sin Yoos, pero no desesperes, cada día te damos 100.<br><br>¡Que no pare la fiesta!"});
        } else {
          view.set({error: true, error_msg: "No hemos podido enviar tu resultado correctamente.<br><br>¿Te importaría enviarlo de nuevo?"});
        }
      }
    };

    if(typeof(Storage) !== "undefined") {
      if(localStorage.getItem("dareyoo_access_token")) {
        access_token = localStorage.getItem("dareyoo_access_token");
        api("/me/", null, function(event) {
          if(event.target.status == 200) {
            user = JSON.parse(event.currentTarget.responseText);
            view.set({user: user});
          } else {
            access_token = "";
            localStorage.setItem("dareyoo_access_token", "");
            APISendImpression(init);
          }
        });
      }
    }

    var view = new Ractive({
      el: opts.el,
      template: template,
      data: {
        initial_call_to_action: true,
        user: null,
        title: "",
        next_title: "",
        next_link: "",
        choices: [],
        initial_loading: true,
        participate: false,
        football_result: false,
        basketball_result: false,
        generic: false,
        register: false,
        share: false,
        error: false,
        error_msg: "",
        loading: false,
        result1: null,
        result2: null,
        error_result1: false,
        error_result2: false,
        error_generic: false,
        email: "",
        password: "",
        header_pic: "",
        footer_pic: ""

      }
    });
    
    view.on('apostar', onApostarClick);
    view.on('result', onResultClick);
    view.on('registrar', onRegisterClick);
    view.on('twitter_share', onTwitterClick);
    view.on('facebook_share', onFacebookClick);
    view.on('error_off', onErrorClick);
    view.on('interaction', APISendInteraction);
    view.on('over', function() { view.set({initial_call_to_action: false}); });
    view.on('header', onHeaderClick);
    view.on('footer', onFooterClick);
    view.observe('result1', function ( newValue, oldValue, keypath ) {
      view.set({error_result1: false});
    });
    view.observe('result2', function ( newValue, oldValue, keypath ) {
      view.set({error_result2: false});
    });
    
    var init = function(event) {
      if(event.target.status == 200) {
        widget = JSON.parse(event.currentTarget.responseText);
        bet = widget.bets[0];
        view.set({title: bet.title,
          next_bet: widget.next_bets[0],
          bg: widget.bg_pic,
          header_pic: widget.header_pic,
          footer_pic: widget.footer_pic,
          bids: bet.bids,
          choices: bet.choices});
        if(bet.lottery_type == "football_result") {
          view.set({football_result: true});
        } else if(bet.lottery_type == "basketball_result") {
          view.set({basketball_result: true});
        } else {
          view.set({generic: true});
        }
        view.set({initial_loading: false, participate: true});
        var c = document.getElementById("dareyoo-widget-content");
        var t = document.getElementById("dareyoo-generic-bet-title");
        var g = document.getElementsByClassName("results-wrapper")[0];
        if(g)
          g.style.height = c.offsetHeight - t.offsetHeight - 25 + "px";
      } else {
        //TODO: error!
      }
    };

    APISendImpression(init);
  };
});
