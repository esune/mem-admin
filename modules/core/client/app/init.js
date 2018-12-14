'use strict';

//Start by defining the main module and adding the module dependencies
angular.module(ApplicationConfiguration.applicationModuleName, ApplicationConfiguration.applicationModuleVendorDependencies);

// Setting HTML5 Location Mode
angular.module(ApplicationConfiguration.applicationModuleName).config(['$locationProvider', '$httpProvider', 'uiGmapGoogleMapApiProvider',
  function ($locationProvider, $httpProvider, uiGmapGoogleMapApiProvider) {
    $locationProvider.html5Mode(true).hashPrefix('!');

    $httpProvider.interceptors.push('authInterceptor');

    $httpProvider.defaults.cache = false;
    if (!$httpProvider.defaults.headers.get) {
      $httpProvider.defaults.headers.get = {};
    }
    // disable IE ajax request caching
    $httpProvider.defaults.headers.get['If-Modified-Since'] = '0';

    uiGmapGoogleMapApiProvider.configure({
      key: 'AIzaSyDRvt9v0RfyhUgmwroWk1wlTSKBL0c7ldM',
      v: 'weekly',
      // libraries: 'weather,geometry,visualization'
    });
  }
]);

angular.module(ApplicationConfiguration.applicationModuleName).run(function ($window, $rootScope, $state, $uibModalStack, Authentication, _, $cookies, Application, ContextService, AlertService) {


  // Check authentication before changing state
  $rootScope.$on('$stateChangeStart', function (event, toState, toParams) {
    //
    // for some states just go, no pre-processing
    //
    if (~['authentication.signin', 'forbidden', 'not-found'].indexOf (toState.name)) {
      return true;
    }
    else {
      if (!ContextService.isSynced(toState, toParams)) {
        event.preventDefault();
        ContextService.sync(toState, toParams).then(function() {
          if (ContextService.isAllowed(toState.data)) {
            $state.go(toState, toParams);
          } else {
            $state.go('forbidden');
          }
        }, function() {
          return false;
        });
      } else {
        // proceed...
        if (ContextService.isAllowed(toState.data)) {
          return true;
        } else {
          event.preventDefault();
          $state.go('forbidden');
        }
      }
    }
  });

  // Record previous state
  $rootScope.$on('$stateChangeSuccess', function (event, toState, toParams, fromState, fromParams) {
    document.body.scrollTop = document.documentElement.scrollTop = 0;
    if (!fromState.data || !fromState.data.ignoreState) {
      $state.previous = {
        state: fromState,
        params: fromParams,
        href: $state.href(fromState, fromParams)
      };
    }
  });

  // Close modals/alerts when navigating away from the current page (e.g.: browser back),
  // unless it was specified to act differently.
  $rootScope.$on('$locationChangeStart', function() {
    $uibModalStack.dismissAll();
    if (!AlertService.persistOnRouteChange) {
      AlertService.dismissAll();
    }
    // ensure next transitions clear the currently displayed alerts
    AlertService.persistOnRouteChange = false;
  });
});

// Ensures all modals can only be closed by clicking X or buttons
angular.module('ui.bootstrap').config(function($provide) {
  $provide.decorator('$uibModal', function($delegate) {
    var open = $delegate.open;

    $delegate.open = function(options) {
      options = angular.extend(options || {}, {
        backdrop: 'static',
        keyboard: false
      });
      return open(options);
    };

    return $delegate;
  });
});

//Then define the init function for starting up the application
angular.element(document).ready(function () {
  //Fixing facebook bug with redirect
  if (window.location.hash && window.location.hash === '#_=_') {
    if (window.history && history.pushState) {
      window.history.pushState('', document.title, window.location.pathname);
    } else {
      // Prevent scrolling by storing the page's current scroll offset
      var scroll = {
        top: document.body.scrollTop,
        left: document.body.scrollLeft
      };
      window.location.hash = '';
      // Restore the scroll offset, should be flicker free
      document.body.scrollTop = scroll.top;
      document.body.scrollLeft = scroll.left;
    }
  }

  // make sure we don't have any issues in ie getting the location.origin...
  if (!window.location.origin) {
    window.location.origin = window.location.protocol + "//" +
    window.location.hostname +
    (window.location.port ? ':' + window.location.port : '');
  }

  (function (i, s, o, g, r, a, m) {
    i.GoogleAnalyticsObject = r;
    i[r] = i[r] || function () {
      (i[r].q = i[r].q || []).push(arguments);
    };
    i[r].l = 1 * new Date();
    a = s.createElement(o);
    m = s.getElementsByTagName(o)[0];
    a.async = 1;
    a.src = g;
    m.parentNode.insertBefore(a, m);
  })(window, document, 'script', 'https://www.google-analytics.com/analytics.js', 'ga');

  // Key for MEM UA-111256359-1
  window.ga('create', 'UA-111256359-1', 'auto');
  window.ga('set', 'anonymizeIp', true);
  window.ga('set', 'hostname', window.location.hostname);
  window.ga('send', 'pageview');

  function fetchInitData() {
    var initInjector = angular.injector(["ng"]);
    var $http = initInjector.get("$http");

    // Get the stored Code Lists
    // make them available to the CodeList service (which can parse / refresh as necessary)
    return $http.get('api/codelists?date=' + new Date().getTime()).then(function(response) {
      angular.module(ApplicationConfiguration.applicationModuleName).constant("INIT_DATA.CODE_LISTS", response.data);
    }, function(/* errorResponse */) {
      // swallow rejected promise error
    });
  }

  function bootstrapApplication() {
    angular.bootstrap(document, [ApplicationConfiguration.applicationModuleName]);
  }

  fetchInitData().then(bootstrapApplication);

});
