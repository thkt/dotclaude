#!/usr/bin/env osascript

on run argv
    -- Get notification message (if argument provided)
    set notificationMessage to "Task completed!"
    if (count of argv) > 0 then
        set notificationMessage to item 1 of argv
    end if

    tell application "System Events"
        try
            -- If Ghostty app exists, use its icon
            if application "Ghostty" exists then
                -- Get application path and reference icon
                set appPath to POSIX path of (path to application "Ghostty")
                set iconPath to appPath & "Contents/Resources/AppIcon.icns"

                -- Display dialog with error handling
                try
                    set dialogResult to display dialog notificationMessage buttons {"Later", "Open Ghostty"} default button 2 with title "Claude Code" with icon (POSIX file iconPath as alias)
                on error
                    -- If icon loading fails, display without icon
                    set dialogResult to display dialog notificationMessage buttons {"Later", "Open Ghostty"} default button 2 with title "Claude Code"
                end try
            else
                -- If Ghostty is not installed
                set dialogResult to display dialog notificationMessage buttons {"OK"} default button 1 with title "Claude Code"
            end if

            -- Take action based on button selection
            if button returned of dialogResult = "Open Ghostty" then
                tell application "Ghostty" to activate
            end if

        on error errMsg
            -- If error occurs, display simple notification
            display notification notificationMessage with title "Claude Code"
        end try
    end tell
end run
