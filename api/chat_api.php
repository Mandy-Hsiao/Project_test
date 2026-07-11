<?php

$question = $_POST["question"] ?? "";

$data = [
    "model" => "qwen2.5:3b",
    "messages" => [
        [
            "role" => "user",
            "content" => $question
        ]
    ],
    "stream" => false
];

//呼叫Python腳本
$question = $_POST["question"] ?? "";

if ($question === "") {
    echo "請輸入問題。";
    exit;
}

$python = "C:\\xampp\\htdocs\\Project_test\\venv\\Scripts\\python.exe";
$script = "C:\\xampp\\htdocs\\Project_test\\rag\\rag_answer.py";

$cmd = escapeshellcmd($python) . " " .
       escapeshellarg($script) . " " .
       escapeshellarg($question);

$output = shell_exec($cmd);

echo nl2br(htmlspecialchars($output, ENT_QUOTES, "UTF-8"));
?>