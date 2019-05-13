function parse_query_string(query) {
    var vars = query.split("&");
    var query_string = {};
    for (var i = 0; i < vars.length; i++) {
        var pair = vars[i].split("=");
        var key = decodeURIComponent(pair[0]);
        var value = decodeURIComponent(pair[1]);
        // If first entry with this name
        if (typeof query_string[key] === "undefined") {
            query_string[key] = decodeURIComponent(value);
            // If second entry with this name
        } else if (typeof query_string[key] === "string") {
            var arr = [query_string[key], decodeURIComponent(value)];
            query_string[key] = arr;
            // If third or later entry with this name
        } else {
            query_string[key].push(decodeURIComponent(value));
        }
    }
    return query_string;
}
function ajaxSubmitForm() {
    var username = window.location.search;
    var userName = parse_query_string(username);
    var whole = Object.values(username);
    var newWhole = whole.splice(6);
    var newWhole2 = newWhole.join("");
    var lastnameElement = document.getElementById("lastName");
    var firstnameElement = document.getElementById("firstName")
    var stateElement = document.getElementById("state");
    var interestsElement = document.getElementById("interests");

    var lastName = lastnameElement.value;
    var firstName = firstnameElement.value;
    var state = stateElement.value;
    var interests = interestsElement.value;
    console.log("First Name: " + firstName + " Last Name: " + lastName + " Interest: " + interests + " State: " + state);

        var xhr = new XMLHttpRequest();
        xhr.onreadystatechange = function() {
            if (this.readyState == 4) {
                var msgElement = document.getElementById("msg");
                if (msg) {
                    msg.innerHTML = this.responseText;
                    if (this.status == 200) {
                        msg.innerHTML = "Profile Updated Successfully " +
                            "You will be redirected to the Matches Page in 5 seconds " +
                            "or <a href='http://localhost:8080/matches.html'>click here</a>";
                        setTimeout(function() {
                            window.location.href = "http://localhost:8080/matches.html";
                        }, 5000);
                    }
                    // else if(this.status == 412) {
                    //     msg.innerHTML = "Username or Password Incorrect. Please Try Again..." + " Page will refresh in 5 seconds.";
                    //     setTimeout(function() {
                    //         window.location.reload();
                    //     }, 5000);
                    // }
                }
            }
        };
        xhr.open("POST", window.location.href, true);
        xhr.setRequestHeader("Content-type",
            "application/x-www-form-urlencoded");
        xhr.send("username="+newWhole2+"&firstName="+firstName+"&lastName="+lastName+"&state="+state+"&interests="+interests);
}
