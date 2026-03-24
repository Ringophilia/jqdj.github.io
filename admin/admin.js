(function () {
    "use strict";

    // ========== 安全配置 ==========
    var REPO = "Ringophilia/jqdj.github.io";
    var MAX_LOGIN_ATTEMPTS = 5;
    var LOCKOUT_DURATION_MS = 15 * 60 * 1000;
    var SESSION_TIMEOUT_MS = 30 * 60 * 1000;
    var MAX_FILE_SIZE = 2 * 1024 * 1024;
    var ALLOWED_TYPES = ["image/png", "image/jpeg"];
    var QR_PATH = "assets/qrcode.png";
    var CONTENT_PATH = "assets/content.json";

    // ========== 状态 ==========
    var state = {
        token: null,
        user: null,
        sessionStart: null,
        sessionTimer: null,
        pendingFile: null,
        existingSha: null,
        contentSha: null
    };

    // ========== 登录限流（localStorage） ==========
    function getLoginAttempts() {
        try {
            var data = JSON.parse(localStorage.getItem("_admin_la") || "{}");
            if (data.lockUntil && Date.now() < data.lockUntil) {
                return data;
            }
            if (data.lockUntil && Date.now() >= data.lockUntil) {
                localStorage.removeItem("_admin_la");
                return { count: 0 };
            }
            return data.count ? data : { count: 0 };
        } catch (e) {
            return { count: 0 };
        }
    }

    function recordFailedAttempt() {
        var data = getLoginAttempts();
        data.count = (data.count || 0) + 1;
        if (data.count >= MAX_LOGIN_ATTEMPTS) {
            data.lockUntil = Date.now() + LOCKOUT_DURATION_MS;
        }
        localStorage.setItem("_admin_la", JSON.stringify(data));
        return data;
    }

    function clearLoginAttempts() {
        localStorage.removeItem("_admin_la");
    }

    function isLockedOut() {
        var data = getLoginAttempts();
        return data.lockUntil && Date.now() < data.lockUntil;
    }

    function getRemainingLockout() {
        var data = getLoginAttempts();
        if (!data.lockUntil) return 0;
        return Math.max(0, Math.ceil((data.lockUntil - Date.now()) / 60000));
    }

    // ========== 工具函数 ==========
    function showMsg(id, text, type) {
        var el = document.getElementById(id);
        el.textContent = text;
        el.className = "msg " + type;
    }

    function hideMsg(id) {
        var el = document.getElementById(id);
        el.className = "msg";
        el.style.display = "none";
    }

    // ========== GitHub API ==========
    function ghFetch(endpoint, options) {
        options = options || {};
        var headers = {
            "Authorization": "Bearer " + state.token,
            "Accept": "application/vnd.github.v3+json"
        };
        if (options.body) {
            headers["Content-Type"] = "application/json";
        }
        return fetch("https://api.github.com" + endpoint, {
            method: options.method || "GET",
            headers: headers,
            body: options.body ? JSON.stringify(options.body) : undefined
        }).then(function (res) {
            if (res.status === 401) {
                handleLogout();
                throw new Error("认证失败，请重新登录");
            }
            return res;
        });
    }

    // ========== 登录 ==========
    function handleLogin() {
        if (isLockedOut()) {
            showMsg("login-msg", "登录尝试过多，请 " + getRemainingLockout() + " 分钟后再试", "error");
            return;
        }

        var token = document.getElementById("token-input").value.trim();

        if (!token) {
            showMsg("login-msg", "请输入 Token", "error");
            return;
        }

        if (!/^ghp_[a-zA-Z0-9]{36,}$/.test(token) && !/^github_pat_[a-zA-Z0-9_]{22,}$/.test(token)) {
            showMsg("login-msg", "Token 格式不正确", "error");
            return;
        }

        var btn = document.getElementById("login-btn");
        btn.disabled = true;
        btn.textContent = "验证中...";
        showMsg("login-msg", "正在验证权限...", "info");

        state.token = token;

        Promise.all([
            ghFetch("/user"),
            ghFetch("/repos/" + REPO)
        ]).then(function (responses) {
            if (!responses[0].ok) throw new Error("Token 无效");
            if (!responses[1].ok) throw new Error("无法访问该仓库");
            return Promise.all([responses[0].json(), responses[1].json()]);
        }).then(function (data) {
            var user = data[0];
            var repoData = data[1];

            if (!repoData.permissions || !repoData.permissions.push) {
                throw new Error("你没有该仓库的写入权限");
            }

            state.user = user;
            state.sessionStart = Date.now();
            clearLoginAttempts();

            document.getElementById("token-input").value = "";

            showAdminView();
        }).catch(function (err) {
            state.token = null;
            var attempt = recordFailedAttempt();
            var remaining = MAX_LOGIN_ATTEMPTS - (attempt.count || 0);
            var msg = err.message || "登录失败";
            if (remaining > 0 && remaining < MAX_LOGIN_ATTEMPTS) {
                msg += "（还剩 " + remaining + " 次尝试机会）";
            } else if (remaining <= 0) {
                msg = "登录尝试过多，请 15 分钟后再试";
            }
            showMsg("login-msg", msg, "error");
        }).finally(function () {
            btn.disabled = false;
            btn.textContent = "验证并登录";
        });
    }

    // ========== 管理界面 ==========
    function showAdminView() {
        document.getElementById("login-view").classList.add("hidden");
        document.getElementById("admin-view").classList.remove("hidden");

        var userInfoEl = document.getElementById("user-info");
        userInfoEl.textContent = "";
        var avatar = document.createElement("img");
        avatar.src = state.user.avatar_url;
        avatar.alt = "avatar";
        var infoDiv = document.createElement("div");
        var nameDiv = document.createElement("div");
        nameDiv.className = "name";
        nameDiv.textContent = state.user.login;
        var roleDiv = document.createElement("div");
        roleDiv.className = "role";
        roleDiv.textContent = "管理员";
        infoDiv.appendChild(nameDiv);
        infoDiv.appendChild(roleDiv);
        userInfoEl.appendChild(avatar);
        userInfoEl.appendChild(infoDiv);

        startSessionTimer();
        loadCurrentQR();
        loadContent();
    }

    function startSessionTimer() {
        function update() {
            var elapsed = Date.now() - state.sessionStart;
            var remaining = SESSION_TIMEOUT_MS - elapsed;
            if (remaining <= 0) {
                handleLogout();
                return;
            }
            var min = Math.floor(remaining / 60000);
            var sec = Math.floor((remaining % 60000) / 1000);
            document.getElementById("session-timer").textContent =
                "会话剩余时间：" + min + ":" + (sec < 10 ? "0" : "") + sec;
        }
        update();
        state.sessionTimer = setInterval(update, 1000);
    }

    function loadCurrentQR() {
        var container = document.getElementById("current-qr");
        ghFetch("/repos/" + REPO + "/contents/" + QR_PATH)
            .then(function (res) {
                if (res.status === 404) {
                    container.textContent = "";
                    var noQr = document.createElement("p");
                    noQr.style.cssText = "color:#c9a0b0;font-size:13px;";
                    noQr.textContent = "暂无二维码，请上传";
                    container.appendChild(noQr);
                    state.existingSha = null;
                    return null;
                }
                return res.json();
            })
            .then(function (data) {
                if (!data) return;
                state.existingSha = data.sha;
                container.textContent = "";
                var img = document.createElement("img");
                img.src = "data:image/png;base64," + data.content.replace(/\n/g, "");
                img.alt = "当前二维码";
                var label = document.createElement("p");
                label.className = "label";
                label.textContent = "当前使用中的二维码";
                container.appendChild(img);
                container.appendChild(label);
            })
            .catch(function () {
                container.textContent = "";
                var errP = document.createElement("p");
                errP.style.cssText = "color:#ff6b8a;font-size:13px;";
                errP.textContent = "加载失败";
                container.appendChild(errP);
            });
    }

    // ========== 文案管理 ==========
    function loadContent() {
        ghFetch("/repos/" + REPO + "/contents/" + CONTENT_PATH)
            .then(function (res) {
                if (res.status === 404) {
                    state.contentSha = null;
                    return null;
                }
                return res.json();
            })
            .then(function (data) {
                if (!data) return;
                state.contentSha = data.sha;
                var content = JSON.parse(decodeURIComponent(escape(atob(data.content.replace(/\n/g, "")))));
                document.getElementById("content-about").value = content.about || "";
                document.getElementById("content-phone").value = content.phone || "";
                document.getElementById("content-email").value = content.email || "";
                document.getElementById("content-wechat").value = content.wechat || "";
            })
            .catch(function () {
                showMsg("content-msg", "加载文案失败", "error");
            });
    }

    function handleSaveContent() {
        if (!state.token) return;

        var content = {
            about: document.getElementById("content-about").value.trim(),
            phone: document.getElementById("content-phone").value.trim(),
            email: document.getElementById("content-email").value.trim(),
            wechat: document.getElementById("content-wechat").value.trim()
        };

        var btn = document.getElementById("save-content-btn");
        btn.disabled = true;
        btn.textContent = "保存中...";

        var encoded = btoa(unescape(encodeURIComponent(JSON.stringify(content, null, 2) + "\n")));

        var body = {
            message: "更新首页文案 - by " + state.user.login,
            content: encoded,
            branch: "main"
        };

        if (state.contentSha) {
            body.sha = state.contentSha;
        }

        ghFetch("/repos/" + REPO + "/contents/" + CONTENT_PATH, {
            method: "PUT",
            body: body
        })
        .then(function (res) {
            if (!res.ok) {
                return res.json().then(function (d) {
                    throw new Error(d.message || "保存失败");
                });
            }
            return res.json();
        })
        .then(function (data) {
            state.contentSha = data.content.sha;
            showMsg("content-msg", "文案保存成功！GitHub Pages 将在几分钟内自动部署。", "success");
        })
        .catch(function (err) {
            showMsg("content-msg", "保存失败：" + err.message, "error");
        })
        .finally(function () {
            btn.disabled = false;
            btn.textContent = "保存文案";
        });
    }

    // ========== 文件上传 ==========
    var uploadZone = document.getElementById("upload-zone");
    var fileInput = document.getElementById("file-input");

    uploadZone.addEventListener("click", function () {
        fileInput.click();
    });

    uploadZone.addEventListener("dragover", function (e) {
        e.preventDefault();
        uploadZone.classList.add("dragover");
    });

    uploadZone.addEventListener("dragleave", function () {
        uploadZone.classList.remove("dragover");
    });

    uploadZone.addEventListener("drop", function (e) {
        e.preventDefault();
        uploadZone.classList.remove("dragover");
        if (e.dataTransfer.files.length) {
            processFile(e.dataTransfer.files[0]);
        }
    });

    fileInput.addEventListener("change", function () {
        if (fileInput.files.length) {
            processFile(fileInput.files[0]);
        }
    });

    function processFile(file) {
        hideMsg("upload-msg");

        if (ALLOWED_TYPES.indexOf(file.type) === -1) {
            showMsg("upload-msg", "仅支持 PNG 和 JPG 格式", "error");
            return;
        }

        if (file.size > MAX_FILE_SIZE) {
            showMsg("upload-msg", "文件大小不能超过 2MB", "error");
            return;
        }

        var reader = new FileReader();
        reader.onload = function (e) {
            var arr = new Uint8Array(e.target.result).subarray(0, 4);
            var header = "";
            for (var i = 0; i < arr.length; i++) {
                header += arr[i].toString(16).padStart(2, "0");
            }

            if (header.indexOf("89504e47") !== 0 && header.indexOf("ffd8ff") !== 0) {
                showMsg("upload-msg", "文件内容不是有效的图片格式", "error");
                return;
            }

            var previewReader = new FileReader();
            previewReader.onload = function (pe) {
                state.pendingFile = pe.target.result;
                document.getElementById("preview-img").src = pe.target.result;
                document.getElementById("preview-area").style.display = "block";
                uploadZone.style.display = "none";
            };
            previewReader.readAsDataURL(file);
        };
        reader.readAsArrayBuffer(file);
    }

    function cancelUpload() {
        state.pendingFile = null;
        document.getElementById("preview-area").style.display = "none";
        uploadZone.style.display = "";
        fileInput.value = "";
    }

    function handleUpload() {
        if (!state.pendingFile || !state.token) return;

        var btn = document.getElementById("upload-btn");
        btn.disabled = true;
        btn.textContent = "上传中...";

        var base64 = state.pendingFile.split(",")[1];

        var body = {
            message: "更新微信二维码 - by " + state.user.login,
            content: base64,
            branch: "main"
        };

        if (state.existingSha) {
            body.sha = state.existingSha;
        }

        ghFetch("/repos/" + REPO + "/contents/" + QR_PATH, {
            method: "PUT",
            body: body
        })
        .then(function (res) {
            if (!res.ok) {
                return res.json().then(function (d) {
                    throw new Error(d.message || "上传失败");
                });
            }
            return res.json();
        })
        .then(function (data) {
            state.existingSha = data.content.sha;
            showMsg("upload-msg", "二维码更新成功！GitHub Pages 将在几分钟内自动部署。", "success");
            cancelUpload();
            loadCurrentQR();
        })
        .catch(function (err) {
            showMsg("upload-msg", "上传失败：" + err.message, "error");
        })
        .finally(function () {
            btn.disabled = false;
            btn.textContent = "确认上传";
        });
    }

    // ========== 登出 ==========
    function handleLogout() {
        state.token = null;
        state.user = null;
        state.pendingFile = null;
        state.existingSha = null;
        state.contentSha = null;
        state.sessionStart = null;

        if (state.sessionTimer) {
            clearInterval(state.sessionTimer);
            state.sessionTimer = null;
        }

        document.getElementById("admin-view").classList.add("hidden");
        document.getElementById("login-view").classList.remove("hidden");
        document.getElementById("content-about").value = "";
        document.getElementById("content-phone").value = "";
        document.getElementById("content-email").value = "";
        document.getElementById("content-wechat").value = "";
        hideMsg("login-msg");
        hideMsg("content-msg");
    }

    // ========== 绑定事件 ==========
    document.getElementById("login-btn").addEventListener("click", handleLogin);
    document.getElementById("cancel-btn").addEventListener("click", cancelUpload);
    document.getElementById("upload-btn").addEventListener("click", handleUpload);
    document.getElementById("logout-btn").addEventListener("click", handleLogout);
    document.getElementById("save-content-btn").addEventListener("click", handleSaveContent);

    // ========== 页面关闭时清理 ==========
    window.addEventListener("beforeunload", function () {
        state.token = null;
    });

    // ========== 防止在 iframe 中加载 ==========
    if (window.top !== window.self) {
        document.body.textContent = "禁止在 iframe 中加载此页面";
    }

})();
