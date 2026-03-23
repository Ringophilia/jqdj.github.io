(function(){
    var container = document.getElementById("bg-deco");
    var shapes = ["heart","star","dot"];
    var colors = ["#ffb6c1","#ffd6e0","#ff85a2","#ffc0cb","#ffe4ec","#f8a4b8"];
    for(var i = 0; i < 18; i++){
        var span = document.createElement("span");
        var shape = shapes[i % shapes.length];
        var size = (6 + Math.random() * 12) + "px";
        var color = colors[Math.floor(Math.random() * colors.length)];
        span.className = shape;
        span.style.setProperty("--size", size);
        span.style.setProperty("--color", color);
        span.style.left = (Math.random() * 100) + "%";
        span.style.animationDuration = (12 + Math.random() * 18) + "s";
        span.style.animationDelay = (Math.random() * 20) + "s";
        container.appendChild(span);
    }
})();
