(function(goat){

    window["firebase"].initializeApp({
        apiKey: "AIzaSyBGIsOo1Kd2ULOJYxnBSQErpz704orxbBk",
        authDomain: "todd-lewis-universe.firebaseapp.com",
        databaseURL: "https://todd-lewis-universe.firebaseio.com",
        projectId: "todd-lewis-universe",
        storageBucket: "todd-lewis-universe.appspot.com",
        messagingSenderId: "285267866986"
    });

    goat.router.addRoute('/', 'home', ["data"]);
    goat.router.addRoute('/home', 'home');
    goat.router.addRoute('/other', 'other');
    goat.router.addRoute('/todos', 'todos');

    goat.router.start();

})(window.goat);