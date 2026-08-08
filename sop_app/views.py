import uuid

from django.shortcuts import render, redirect

from rag.rag_answer import get_rag_answer


# 暫時存在記憶體；Django 重啟後會清空
CHAT_STORE = {}


def home(request):
    return render(request, "home.html")


def salary(request):
    return render(request, "salary_calculator.html")


def chatbot(request, theme):
    allowed_themes = {
        "salary": "報酬問題",
        "absence": "無法到課",
        "entry": "入職申請",
    }

    if theme not in allowed_themes:
        return redirect("home")

    chat_id = request.GET.get("chat_id") or request.POST.get("chat_id")

    if not chat_id:
        chat_id = uuid.uuid4().hex[:12]

    if chat_id not in CHAT_STORE:
        CHAT_STORE[chat_id] = {
            "theme": theme,
            "messages": []
        }

    chat_data = CHAT_STORE[chat_id]

    if request.method == "POST":
        question = request.POST.get("question", "").strip()

        if question:
            chat_data["messages"].append({
                "role": "user",
                "content": question
            })

            try:
                answer = get_rag_answer(question)
            except Exception as exc:
                answer = f"抱歉，處理您的問題時發生錯誤：{exc}"

            chat_data["messages"].append({
                "role": "assistant",
                "content": answer
            })

        return redirect(f"/chatbot/{theme}/?chat_id={chat_id}")

    history = []

    for stored_chat_id, stored_data in CHAT_STORE.items():
        if stored_data["theme"] != theme:
            continue

        messages = stored_data["messages"]

        if messages:
            label = messages[0]["content"][:18]
        else:
            label = "新對話"

        history.append({
            "chat_id": stored_chat_id,
            "label": label
        })

    context = {
        "theme": theme,
        "title": allowed_themes[theme],
        "chat_id": chat_id,
        "new_chat_id": uuid.uuid4().hex[:12],
        "messages": chat_data["messages"],
        "history": history
    }

    return render(request, "chat.html", context)