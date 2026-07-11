<!DOCTYPE html>
<html lang="zh-TW">
<head>
    <meta charset="UTF-8">
    <title>SOP AI Chat</title>
</head>
<body>

<input type="text" id="question" placeholder="請輸入問題">
<button type="button" onclick="sendMessage()">送出</button>

<div id="answer"></div>

<script>
async function sendMessage() {
    alert("有按到送出");

    const question = document.getElementById("question").value;

    const response = await fetch("api/chat_api.php", {
        method: "POST",
        headers: {
            "Content-Type": "application/x-www-form-urlencoded"
        },
        body: "question=" + encodeURIComponent(question)
    });

    const result = await response.text();
    document.getElementById("answer").innerText = result;
}
</script>

</body>
</html>