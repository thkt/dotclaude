#!/usr/bin/env osascript

on run argv
    -- 通知メッセージを取得（引数がある場合）
    set notificationMessage to "Task completed!"
    if (count of argv) > 0 then
        set notificationMessage to item 1 of argv
    end if

    tell application "System Events"
        try
            -- Ghosttyアプリが存在する場合、アイコンを使用
            if application "Ghostty" exists then
                -- アプリケーションのパスを取得してアイコンを参照
                set appPath to POSIX path of (path to application "Ghostty")
                set iconPath to appPath & "Contents/Resources/AppIcon.icns"

                -- ダイアログを表示（エラーハンドリング付き）
                try
                    set dialogResult to display dialog notificationMessage buttons {"Later", "Open Ghostty"} default button 2 with title "Claude Code" with icon (POSIX file iconPath as alias)
                on error
                    -- アイコン読み込みに失敗した場合、アイコンなしで表示
                    set dialogResult to display dialog notificationMessage buttons {"Later", "Open Ghostty"} default button 2 with title "Claude Code"
                end try
            else
                -- Ghosttyがインストールされていない場合
                set dialogResult to display dialog notificationMessage buttons {"OK"} default button 1 with title "Claude Code"
            end if

            -- ボタンの選択に応じてアクション
            if button returned of dialogResult = "Open Ghostty" then
                tell application "Ghostty" to activate
            end if

        on error errMsg
            -- エラーが発生した場合、シンプルな通知を表示
            display notification notificationMessage with title "Claude Code"
        end try
    end tell
end run
