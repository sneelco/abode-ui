var abode = angular.module('abode', [
  'ng',
  'ngResource',
  'ui.router',
  'ui.bootstrap',
  'abode.welcome',
  'abode.home',
]);

abode.config(['$stateProvider', '$urlRouterProvider', 'abodeProvider', function($state, $urlRouter, abode) {

  abode.load();

  if (abode.config.interface) {
    $urlRouter.otherwise('/Home/' + abode.config.interface);
    $urlRouter.when('', '/Home/' + abode.config.interface);
  } else {
    $urlRouter.otherwise('/Welcome');
    $urlRouter.when('', '/Welcome');
  }

  $state
    .state('main', {
      url: '',
      templateUrl: "views/main/index.html",
      controller: 'mainController',
      resolve: {
        auth: ['$q', 'abode', 'Auth', function ($q, abode, Auth) {
          var defer = $q.defer();

          if (!abode.config.server) {
            defer.reject({'state': 'welcome', 'message': 'Login Expired'});
            return defer.promise;
          }

          Auth.get(function (auth) {
            abode.auth = auth;
            defer.resolve(auth);
          }).$promise.then(function () {},
          function (response) {

            if (response.status === 403) {
              delete abode.config.auth;
              abode.save();

              defer.reject({'state': 'welcome', 'message': 'Login Expired'});
            } else {
              defer.reject({'message': 'Server has gone away'});
            }

          });
          
          return defer.promise;
        }]
      }
    });

}]);

abode.factory('Auth', ['$resource', 'abode', function($resource, abode) {

  return $resource(abode.url('/api/auth'), {}, {
    login: {
      method: 'POST',
    },
    logout: {
      method: 'DELETE'
    },
    status: {
      method: 'GET'
    },
    changepw: {
      method: 'POST',
      params: {'action': 'changepw'}
    },
  });
}]);

abode.provider('abode', ['$httpProvider', function ($httpProvider) {
  var self = this,
    headers = {},
    initInjector = angular.injector(['ng']);

  var $q = initInjector.get('$q'),
    $http = initInjector.get('$http'),
    $timeout = initInjector.get('$timeout');

  this.config = {};
  this.auth = {};
  this.messages = [];
  this.message_scope = null;


  this.url = function (uri) {
    var url = {};
    url.value = function() {return self.config.server + uri; };
    url.split = function (separator,limit) { return url.value().split(separator,limit); };
    url.replace = function (match, other) { return url.value().replace(match, other); };
    url.toString = function() { return url.value(); };

    return url;
  };

  this.message = function (config) {
    config.type = config.type || 'info';
    self.messages.push(config);

    $timeout(function () {
      self.messages.shift();
      if (self.message_scope) {
        self.message_scope.$digest();
      }
    }, 5000 * self.messages.length);
  };

  this.load = function () {
    try {
      this.config = JSON.parse(localStorage.getItem('abode'));
      this.config = this.config || {};

      if (this.config.auth) {
        $httpProvider.defaults.headers.common.client_token = this.config.auth.client_token;
        $httpProvider.defaults.headers.common.auth_token = this.config.auth.auth_token;
      }
    } catch (e) {
      this.config = {};
    }
  };
  this.save = function (config) {
    config = config || self.config;

    localStorage.setItem('abode', JSON.stringify(config));

  };

  this.$get = function () {
    return {
      config: self.config,
      load: self.load,
      save: self.save,
      auth: self.auth,
      url: self.url,
      messages: self.messages,
      message: self.message,
      message_scope: function (scope) {
        self.message_scope = scope;
      },
    };
  };

}]);

abode.directive('messages', function () {
  return {
    restrict: 'E',
    replace: true,
    scope: {
    },
    templateUrl: 'views/message.html',
    controller: ['$scope', 'abode', function ($scope, abode) {
      abode.message_scope($scope);
      $scope.messages = abode.messages;
    }]
  };
});

abode.controller('rootController', ['$rootScope', '$state', 'abode', function ($rootScope, $state, abode) {

  $rootScope.$on('$stateChangeError', function (event, toState, toParams, fromState, fromParams, error) {

    if (error.message || error.state !== 'welcome') {
      abode.message({'message': error.message || 'Error Loading Page', 'type': 'error'});
    }
    $rootScope.loading = false;
    event.preventDefault();
    if ( ! error ) {
      alert('Application failed to load');
    } else {
      if (error.state && toState.name !== error.state) {
        $state.go(error.state, error);
      }
    }
  });

}]);

abode.controller('mainController', ['$scope', '$state', 'abode', function ($scope, $state, abode) {
  $scope.logout = function () {
    abode.auth.$logout().then(function () {
      console.log('success');
      abode.save({});
      $state.go('welcome');
    }, function (err) {
      abode.message({'message': err.message || 'Unknown Error Occured', 'type': 'failed'});
      abode.config = {};
      abode.save({});
      $state.go('welcome');
    });
  };
}]);