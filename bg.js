(function(){
    // 背景装饰
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

    // 二维码加载失败时显示占位提示
    var qrImg = document.getElementById("qr-image");
    if (qrImg) {
        qrImg.addEventListener("error", function() {
            var wrapper = qrImg.parentElement;
            var placeholder = document.createElement("div");
            placeholder.style.cssText = "width:180px;height:180px;display:flex;align-items:center;justify-content:center;color:#c9a0b0;font-size:13px;";
            placeholder.textContent = "暂无二维码";
            wrapper.replaceChild(placeholder, qrImg);
        });
    }
})();
