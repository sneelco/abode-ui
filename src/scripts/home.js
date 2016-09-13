var home = angular.module('abode.home', []);

home.config(['$stateProvider', '$urlRouterProvider', function($state, $urlRouter) {

  $state
    .state('main.home', {
      url: '/Home/:interface',
      //templateUrl: "views/home/index.html",
      templateUrl: function () {
        return 'views/home/index.html';
      },
      controller: 'homeController',
    });

}]);

home.factory('Interfaces', ['$resource', 'abode', function($resource, abode) {

  return $resource(abode.url('/api/abode/interfaces/:name'));

}]);

home.controller('homeController', ['$scope', '$state', 'abode', function ($scope, $state, abode) {
  console.log(abode.auth);
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