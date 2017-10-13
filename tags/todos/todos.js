$env.todos = [];

goat.http.get("http://localhost:3000/todos", (er, todos) => {
    console.log(JSON.parse(todos));
    $env.todos = JSON.parse(todos);
    
});