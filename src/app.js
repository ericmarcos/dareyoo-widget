define(['angularAMD'], function (angularAMD) {
    var app = angular.module("dareyoo", []);
    // Setup app here. E.g.: run .config with $routeProvider
    app.directive('lala', [function() {
        return {
          restrict: 'E',
          scope: {
            experience: '='
          },
          template: "<div><h2>lala</h2></div>",
          controller: ["$scope", "$element", "$attrs", "$transclude", function($scope, $element, $attrs, $transclude) {
            $scope.cool = function() {
              return 3;
            };
          }]
        };
      }]);
    return angularAMD.bootstrap(app);
});