function login() {
    const username = document.getElementById("username-input");
    const password = document.getElementById("password-input");
    if (username.value == "" || password.value == "") {
        alert("Username and Password Fields must not be empty");
    } else {
        document.location.href = "index.html";
    }
}

