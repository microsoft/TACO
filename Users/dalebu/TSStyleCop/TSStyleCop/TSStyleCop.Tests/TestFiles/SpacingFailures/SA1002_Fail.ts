for (var i = 0 ; i < 100;i++) {
    var foo = "bar" ;
}

// Should not trigger SA1002
for (var i = 10; i < 0;) {
    alert("unreachable");
}
