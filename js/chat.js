async function sendMessage() {
    let question = document.getElementById("question").value;

    let response = await fetch("/Project_test/api/chat_api.php", {
        method: "POST",
        body: new URLSearchParams({
            question: question
        })
    });

    let result = await response.text();

    document.getElementById("answer").innerHTML = result;
}