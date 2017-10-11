//module is the returned object

var firebase = window['firebase'];

function _key(str) {
    return str ? `/${str}` : ''
}

function _list(ar) {
    if (ar) {
        Object.keys(ar).forEach(key => ar[key].id = key);
        return Object.keys(ar).map(key => ar[key]);
    }
    return undefined;
}

function database(path) {
    if (path)
        return firebase.database().ref(path);
    return firebase.database();
}

function get(path, key, onLoad) {
    database(path + _key(key)).once('value').then(snapshot => {
        let data = snapshot.val();
        onLoad(key ? Object.assign({id: key}, data) : _list(data))
    });
}

function set(path, key, obj) {
    database(path + _key(key)).set(obj);
    obj.id = key;
    return obj;
}

function subscribe(path, key, onChange) {
    database(path + _key(key)).on('value', snapshot => {
        let data = snapshot.val();
        onChange(key ? Object.assign({id: key}, data) : _list(data))
    });
}

function remove(path) {
    database(path).remove();
}

function save(path, key, obj) {
    database(path + _key(key)).set(obj);
}

function add(path, item) {
    let key = database(path).push().key;
    database().ref().update({[path + '/' + key]: item});
    return key;
}

module = {
    database: database,
    get: get,
    set: set,
    subscribe: subscribe,
    remove: remove,
    save: save,
    add: add
};