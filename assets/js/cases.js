




console.log("LDKJFLK");

const modal = new bootstrap.Modal(document.getElementById("modal"))

htmx.on("htmx:afterSwap", (e) => {
    // Response targeting #dialog => show the modal             
    console.log("HERLKJERLKJELKJREKJR");
    if (e.detail.target.id == "dialog") {
        modal.show()
    }
});
htmx.on("htmx:beforeSwap", (e) => {
    console.log("HELLLELO");
    // Empty response targeting #dialog => hide the modal
    console.log(e.detail.xhr.response);
    console.log(e.detail.target.id);
    if (e.detail.target.id == "dialog" && !e.detail.xhr.response) {

        modal.hide()
        e.detail.shouldSwap = false
    }
    });
htmx.on("hidden.bs.modal", () => {
    document.getElementById("dialog").innerHTML = ""
});

