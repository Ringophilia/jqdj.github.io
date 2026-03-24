(function () {
    "use strict";

    fetch("assets/content.json")
        .then(function (res) {
            if (!res.ok) throw new Error(res.status);
            return res.json();
        })
        .then(function (data) {
            if (data.about) {
                var aboutEl = document.getElementById("about-text");
                if (aboutEl) {
                    aboutEl.textContent = data.about;
                    aboutEl.classList.remove("placeholder");
                }
            }
            if (data.phone) {
                var phoneEl = document.getElementById("phone-value");
                if (phoneEl) {
                    phoneEl.textContent = data.phone;
                    phoneEl.classList.remove("placeholder");
                }
            }
            if (data.email) {
                var emailEl = document.getElementById("email-value");
                if (emailEl) {
                    emailEl.textContent = data.email;
                    emailEl.classList.remove("placeholder");
                }
            }
            if (data.wechat) {
                var wechatEl = document.getElementById("wechat-value");
                if (wechatEl) {
                    wechatEl.textContent = data.wechat;
                    wechatEl.classList.remove("placeholder");
                }
            }
        })
        .catch(function () {
            // 加载失败时保留 HTML 中的默认占位文案
        });
})();
