var home = angular.module('abode.home', []);

home.config(['$stateProvider', '$urlRouterProvider', function($state, $urlRouter) {

  $state
    .state('main.home', {
      url: '/Home/:interface',
      template: '<interface class="interface"></interface>',
      controller: 'homeController',
    });

}]);

home.factory('Interfaces', ['$resource', 'abode', function($resource, abode) {

  return $resource(abode.url('/api/abode/interfaces/:name'));

}]);

home.directive('interface', ['$sce', 'abode', function ($sce, abode) {
  return {
    restrict: 'E',
    replace: false,
    scope: {},
    templateUrl: function () {
      return $sce.trustAsResourceUrl(abode.url('/api/abode/views/home.html').value());
      //return $sce.trustAsResourceUrl(abode.url('/api/abode/interfaces/' + abode.config.interface).value());
    }
  };
}]);

home.controller('homeController', ['$scope', '$state', '$templateCache', 'abode', function ($scope, $state, $templateCache, abode) {


}]);