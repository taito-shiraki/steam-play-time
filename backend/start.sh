#!/bin/bash
# バックエンドサーバーを起動（ホットリロード付き）
uvicorn main:app --reload --host 0.0.0.0 --port 8000
