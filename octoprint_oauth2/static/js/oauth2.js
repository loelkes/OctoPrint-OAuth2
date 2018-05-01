var glob;
$(function() {

    function parseUrl(url) {
        var parser = document.createElement('a');
        parser.href = url;

        return parser;
    }

    function guid() {
      function s4() {
        return Math.floor((1 + Math.random()) * 0x10000)
          .toString(16)
          .substring(1);
      }
      return s4() + s4() + '-' + s4() + '-' + s4() + '-' + s4() + '-' + s4() + s4() + s4();
    }


    function getParameterByName(name, url) {
        if (!url) url = window.location.href;
        name = name.replace(/[\[\]]/g, "\\$&");
        var regex = new RegExp("[?&]" + name + "(=([^&#]*)|&|#|$)"),
            results = regex.exec(url);
        if (!results) return null;
        if (!results[2]) return '';
        return decodeURIComponent(results[2].replace(/\+/g, " "));
    }


    function OAuthLoginModel(parameters) {
        var self = this;


        $(".dropdown-menu").click(function (e) {
            e.stopPropagation();
        });

        self.loginState = parameters[0];
        self.settings = parameters[1];
        self.control = parameters[2];


        self.loginState.login = function () {

            var oauth_plugin_settings = self.settings.settings.plugins.oauth2;
            var active = self.settings.settings.plugins.oauth2.active_client();

            var redirect_uri = parseUrl(window.location.href).origin + "/";

            var client_id = oauth_plugin_settings[active][redirect_uri].client_id();
            var login_path = oauth_plugin_settings[active].login_path();

            // persistent browser storage pro ulozeni state
            var state = guid();

            var params = ['response_type=code', 'client_id=' + client_id, 'redirect_uri=' + redirect_uri, 'state=' + state];
            var query = params.join('&');
            var url = login_path + query;

            window.location.replace(url);
        };

        self.loginState.logout = function() {
            var active = self.settings.settings.plugins.oauth2.active_client();
            var provider = parseUrl(self.settings.settings.plugins.oauth2[active].login_path()).host;

            return OctoPrint.browser.logout()
                .done(function(response) {

                    new PNotify({title: gettext("Logout from OctoPrint successful"), text: gettext("You are now logged out"), type: "success"});
                    new PNotify({title: gettext("OAuth Logout"), text: gettext("To log out completely, make sure to log out from OAuth provider: " + provider), hide: false});

                    self.loginState.fromResponse(response);
                })
                .error(function(error) {
                    if (error && error.status === 401) {
                         self.loginState.fromResponse(false);
                    }
                });
        };



        self.loginState.userMenuText = ko.pureComputed(function () {
           if (self.loginState.loggedIn()){
               return self.loginState.username();
           }
           else {
               return gettext("Login via OAuth");
           }
        });

        var code = getParameterByName("code",window.location.href);
        var stateFromOAuth = getParameterByName("state", window.location.href);

        // todo check state
        if(!!stateFromOAuth && !!code){
            var url = parseUrl(window.location.href).origin + "/";

            OctoPrint.browser.login(code, url, false)
                .done(function (response) {
                    new PNotify({
                        title: gettext("Login OK"),
                        text: _.sprintf(gettext('OAuth Logged as "%(username)s"'),
                            {username: response.name}), type:"success"});
                    self.loginState.fromResponse(response);
                    self.loginState.loginUser("");
                    self.loginState.loginPass("");
                    self.loginState.loginRemember(false);

                if (history && history.replaceState) {
                        history.replaceState({success: true}, document.title, window.location.pathname);
                    }
                })
                .fail(function(response) {
                    switch(response.status) {
                        case 401: {
                            new PNotify({
                                title: gettext("Login failed"),
                                text: gettext("User unknown or wrong password"),
                                type: "error"
                            });
                            break;
                        }
                        case 403: {
                            new PNotify({
                                title: gettext("Login failed"),
                                text: gettext("Your account is deactivated"),
                                type: "error"
                            });
                            break;
                        }
                    }
                });
        }
    }


    self.onStartup = function () {
        self.elementOAuthLogin = $("#oauth_login");
    };


    // This is how our plugin registers itself with the application, by adding some configuration
    // information to the global variable OCTOPRINT_VIEWMODELS
    OCTOPRINT_VIEWMODELS.push({
        // This is the constructor to call for instantiating the plugin
        construct: OAuthLoginModel,

        // This is a list of dependencies to inject into the plugin, the order which you request
        // here is the order in which the dependencies will be injected into your view model upon
        // instantiation via the parameters argument
        dependencies: ["loginStateViewModel", "settingsViewModel", "controlViewModel"],

        // Finally, this is the list of selectors for all elements we want this view model to be bound to.
        // elements: ["#tab_plugin_oauthfit"]
    });
});