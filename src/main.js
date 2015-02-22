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
  /**var DAREYOO_API_URL = 'http://dareyoo.dev:8000/api/v1';
  var DAREYOO_LOGIN_URL = 'http://dareyoo.dev:8000/oauth2/access_token';
  var DAREYOO_API_ID = '3cbaf99470699751ce96';
  var DAREYOO_API_SECRET = 'badfc6a14c8b3a0137db589068a2ed316d2ffefd';**/

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
    var participated_bets = [];
    WIDGET_NAME = opts.config.name;
    var tracking_code = "utm_source=referal&utm_medium=" + WIDGET_NAME + "&utm_campaign=widget" + WIDGET_NAME;

    var formatString = function() {
      // The string containing the format items (e.g. "{0}")
      // will and always has to be the first argument.
      var theString = arguments[0];
      
      // start with the second argument (i = 1)
      for (var i = 1; i < arguments.length; i++) {
        // "gm" = RegEx options for Global search (more than one instance)
        // and for Multiline search
        var regEx = new RegExp("\\{" + (i - 1) + "\\}", "gm");
        theString = theString.replace(regEx, arguments[i]);
      }
      return theString;
    };

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
      var format = "?format=json";
      if(endpoint.indexOf('?') != -1)
        format = "&format=json";
      var api_url = DAREYOO_API_URL + endpoint + format;
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
      var data = {'participated_bets': participated_bets};
      api("/widget_activation/" + WIDGET_NAME + "/impression/", data, callback);
    };

    var APISendInteraction = function() {
      view.set({initial_call_to_action: false});
      if(!interaction_sent) {
        interaction_sent = true;
        var data = {};
        if(bet)
          data['bet_id'] = bet.id;
        api("/widget_activation/" + WIDGET_NAME + "/interaction/", data);
      }
    };

    var APISendParticipate = function() {
      var data = {result: view.get('result')};
      if(bet)
        data['bet_id'] = bet.id;
      api("/widget_activation/" + WIDGET_NAME + "/participate/", data);
    };

    var APISendRegister = function() {
      var data = {};
      if(bet)
        data['bet_id'] = bet.id;
      api("/widget_activation/" + WIDGET_NAME + "/register/", data);
    };

    var APISendLogin = function() {
      var data = {};
      if(bet)
        data['bet_id'] = bet.id;
      api("/widget_activation/" + WIDGET_NAME + "/login/", data);
    };

    var APISendShare = function(medium) {
      var data = {medium: medium};
      if(bet)
        data['bet_id'] = bet.id;
      api("/widget_activation/" + WIDGET_NAME + "/share/", data);
    };

    var APISendBannerClick = function(banner) {
      var data = {banner: banner};
      if(bet)
        data['bet_id'] = bet.id;
      api("/widget_activation/" + WIDGET_NAME + "/banner/", data);
    };

    var onApostarClick = function() {
      if(!view.get('loading')) {
        APISendParticipate();
        var r = view.get('result');
        var r1 = parseInt(view.get('result1'));
        var r2 = parseInt(view.get('result2'));
        if(bet.lottery_type && bet.lottery_type.indexOf("result") != -1) {
          var max_result = bet.lottery_type == "football_result" ? 20 : 200;
          if(isNaN(r1) || r1 < 0 || r2 > max_result) {
            view.set({error_result1: true});
            return;
          }
          if(isNaN(r2) || r2 < 0 || r2 > max_result) {
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
      var text = formatString(widget.twitter_share_text, view.get('result'));
      var url = "http://www.dareyoo.com/app/main/bet/" + bet.id + "?" + tracking_code;
      window.open('http://twitter.com/share?text=' + text + '&url=' + encodeURIComponent(url),'_blank');
    };

    var onFacebookClick = function(event) {
      APISendShare('facebook');
      var url = "http://www.dareyoo.com/app/main/bet/" + bet.id + "?" + tracking_code;
      var fbpopup = window.open("https://www.facebook.com/sharer/sharer.php?u=" + encodeURIComponent(url), "pop", "width=600, height=400, scrollbars=no");
    };

    var onHeaderClick = function(event) {
      APISendBannerClick('header');
      window.open(widget.header_link,'_blank');
    };

    var onFooterClick = function(event) {
      APISendBannerClick('footer');
      window.open(widget.footer_link,'_blank');
    };

    var onCreaClick = function(event) {
      window.open("http://www.dareyoo.com?" + tracking_code, '_blank');
    };

    var onErrorClick = function(event) {
      view.set({error:false, loading:false});
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
        if(typeof(Storage) !== "undefined")
          localStorage.setItem("dareyoo_access_token", access_token);
        postBid();
      } else {
        request_token(view.get('email'), view.get('password'), function(event){
          if(event.target.status == 200) {
            var data = JSON.parse(event.target.responseText);
            access_token = data.access_token;
            if(typeof(Storage) !== "undefined")
              localStorage.setItem("dareyoo_access_token", data.access_token);
            postBid();
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
        api("/bets/" + bet.id + "/bids/?auto_participate=true", { title:result }, onBidComplete);
      }
    };

    var onBidComplete = function(event) {
      view.set({loading:false});
      if(event.target.status == 201 || event.target.status == 200) {
        view.set({participate:false, register:false, share:true});
        participated_bets.push(bet.id);
        if(typeof(Storage) !== "undefined")
          localStorage.setItem("dareyoo_participated_bets", JSON.stringify(participated_bets));
      } else {
        var message = JSON.parse(event.currentTarget.responseText).detail;
        if(message.indexOf("more than") != -1) {
          view.set({error: true, error_msg: "Parece que ya has participado en esta apuesta."});
          participated_bets.push(bet.id);
          if(typeof(Storage) !== "undefined")
            localStorage.setItem("dareyoo_participated_bets", JSON.stringify(participated_bets));
        } else if(message.indexOf("enough") != -1) {
          view.set({error: true, error_msg: "Parece que te has quedado sin Yoos, pero no desesperes, cada día te damos 100.<br><br>¡Que no pare la fiesta!"});
        } else {
          view.set({error: true, error_msg: "No hemos podido enviar tu resultado correctamente.<br><br>¿Te importaría enviarlo de nuevo?"});
        }
      }
    };

    if(typeof(Storage) !== "undefined") {
      if(localStorage.getItem("dareyoo_participated_bets")) {
        participated_bets = JSON.parse(localStorage.getItem("dareyoo_participated_bets"));
      } else {
        localStorage.setItem("dareyoo_participated_bets", JSON.stringify([]));
      }
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
        no_bets: false,
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
        footer_pic: "",
        percent_1: 0,
        percent_2: 0,
        percent_3: 0,
        top_bid_1: 0,
        top_bid_2: 0,
        top_bid_3: 0,
      }
    });
    
    view.on('apostar', onApostarClick);
    view.on('result', onResultClick);
    view.on('registrar', onRegisterClick);
    view.on('twitter_share', onTwitterClick);
    view.on('facebook_share', onFacebookClick);
    view.on('crea', onCreaClick);
    view.on('error_off', onErrorClick);
    view.on('over', function() {
      view.set({initial_call_to_action: false});
      APISendInteraction();
    });
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
        view.set({
          next_bet: widget.next_bets[0],
          bg: widget.bg_pic,
          header_pic: widget.header_pic,
          footer_pic: widget.footer_pic
        });
        for(var i = 0; i < widget.bets.length; i++) {
          if(widget.bets[i].id == widget.first_bet_id)
              bet = widget.bets[i];
        }
        if(!bet) { //There are no bets active in this widget or the user already participated in all of them
          view.set({
            initial_loading: false,
            no_bets: true
          });
          return;
        }
        view.set({
          title: bet.title,
          bids: bet.bids,
          choices: bet.choices
        });
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
        var sorted_bids = bet.bids.sort(function(a, b) {
            var x = a.participants; var y = b.participants;
            return ((x > y) ? -1 : ((x < y) ? 1 : 0));
        });
        if(!widget.footer_pic) {
          var p = 0;
          for(var i=0; i<sorted_bids.length; i++)
            p += sorted_bids[i].participants;
          var min_percent = 20;
          var length_percent = 30;
          if(sorted_bids.length > 0) {
            var p0 = sorted_bids[0].participants / p;
            document.getElementsByClassName("dareyoo-result-percentage")[0].style.height = (min_percent + p0 * length_percent) + "%";
            document.getElementsByClassName("dareyoo-result-text")[0].innerText = sorted_bids[0].title;
            document.getElementsByClassName("dareyoo-result-percentage-text")[0].innerText = Math.round(p0 * 100) + "%";
          }
          if(sorted_bids.length > 1) {
            var p1 = sorted_bids[1].participants / p;
            document.getElementsByClassName("dareyoo-result-percentage")[1].style.height = (min_percent + p1 * length_percent) + "%";
            document.getElementsByClassName("dareyoo-result-text")[1].innerText = sorted_bids[1].title;
            document.getElementsByClassName("dareyoo-result-percentage-text")[1].innerText = Math.round(p1 * 100) + "%";
          }
          if(sorted_bids.length > 2) {
            var p2 = sorted_bids[2].participants / p;
            document.getElementsByClassName("dareyoo-result-percentage")[2].style.height = (min_percent + p2 * length_percent) + "%";
            document.getElementsByClassName("dareyoo-result-text")[2].innerText = sorted_bids[2].title;
            document.getElementsByClassName("dareyoo-result-percentage-text")[2].innerText = Math.round(p2 * 100) + "%";
          }
        }
      } else {
        //TODO: error!
      }
    };

    APISendImpression(init);
  };
});
