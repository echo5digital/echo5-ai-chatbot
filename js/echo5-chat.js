/**
 * Echo5 AI Chatbot Front-End JavaScript
 *
 * Handles chat interface interactions, user messages, bot responses (simulated),
 * name changes, and sending chat transcripts.
 *
 * @since 0.1.0
 */
document.addEventListener('DOMContentLoaded', function () {
    // DOM element references
    const chatContainer = document.getElementById('echo5-chat-container');
    const namePrompt = document.getElementById('echo5-chat-name-prompt');
    const userNameInput = document.getElementById('echo5-user-name-input');
    const submitNameButton = document.getElementById('echo5-submit-name-button');
    const messageInput = document.getElementById('echo5-chat-message-input');
    const sendMessageButton = document.getElementById('echo5-send-message-button');
    const chatMessages = document.getElementById('echo5-chat-messages');
    const namePromptParagraph = namePrompt ? namePrompt.querySelector('p') : null;
    const chatHeader = document.getElementById('echo5-chat-header');

    console.log('DOM Elements:');
    console.log('  chatContainer:', chatContainer);
    console.log('  namePrompt:', namePrompt);
    console.log('  userNameInput:', userNameInput);
    console.log('  submitNameButton:', submitNameButton);
    console.log('  messageInput:', messageInput);
    console.log('  sendMessageButton:', sendMessageButton);
    console.log('  chatMessages:', chatMessages);
    console.log('  chatHeader:', chatHeader);

    // Conversation history array
    let conversationHistory = [];

    // Localized data from PHP (wp_localize_script)
    // Ensure defaults are provided for robustness in case localization fails or keys are missing.
    const localizedData = window.echo5_chatbot_data || {};
    const pluginUrl = localizedData.plugin_url || './';
    const userAvatarUrl = pluginUrl + 'images/user-avatar.svg';
    const botAvatarUrl = pluginUrl + 'images/bot-avatar.svg';
    const ajaxUrl = localizedData.ajax_url;
    const nonce = localizedData.nonce;
    const sendMessageNonce = localizedData.send_message_nonce;
    const chatbotHeaderText = localizedData.chatbot_header_text || 'AI Chatbot'; // Fallback if not provided
    const changeNameButtonText = localizedData.change_name_button_text || 'Change Name';

    // Message templates from localized data
    const welcomeTemplate = localizedData.welcome_message_template || 'Hello, <strong>%userName%</strong>! How can I help you?';
    const welcomeBackTemplate = localizedData.welcome_message_template || 'Welcome back, <strong>%userName%</strong>! How can I help you?'; // Can be same as welcomeTemplate or specific

    // User's name from localStorage
    let userName = localStorage.getItem('echo5_user_name');

    /**
     * Adds an "End Chat & Send Transcript" button to the chat header.
     * Handles click event to confirm, send transcript, and end chat.
     */
    function setupEndChatButton() {
        if (!chatHeader) return;

        const endChatButton = document.createElement('button');
        endChatButton.id = 'echo5-end-chat-button';
        endChatButton.textContent = localizedData.end_chat_button_text || 'End Chat';
        // Basic styling for the button
        Object.assign(endChatButton.style, {
            float: 'right',
            marginLeft: '10px',
            marginRight: '5px',
            marginTop: '2px',
            marginBottom: '2px',
            padding: '3px 8px',
            fontSize: '0.85em',
            cursor: 'pointer',
            backgroundColor: '#f0ad4e',
            color: 'white',
            border: '1px solid #eea236',
            borderRadius: '3px'
        });
        
        const headerH2 = chatHeader.querySelector('h2');
        if (headerH2) {
             headerH2.style.display = 'inline-block'; // Allow button to float beside h2
        }
        chatHeader.appendChild(endChatButton);

        endChatButton.addEventListener('click', function() {
            if (confirm(localizedData.end_chat_confirm || 'Are you sure you want to end the chat? A transcript will be sent.')) {
                sendConversationToServer();
                if (chatMessages) chatMessages.innerHTML = ''; // Clear messages
                displayBotMessage(localizedData.chat_ended_message || "Chat ended. Thank you!");
                if (messageInput) messageInput.disabled = true;
                if (sendMessageButton) sendMessageButton.disabled = true;
                endChatButton.disabled = true;
                Object.assign(endChatButton.style, { backgroundColor: '#ccc', cursor: 'not-allowed' });
                conversationHistory = []; // Clear history
            }
        });
    }

    /**
     * Adds a "Change Name" button to the chat header.
     * Handles click event to show name prompt and disable chat input.
     */
    function setupChangeNameButton() {
        if (!chatHeader) return;

        const changeNameButton = document.createElement('button');
        changeNameButton.id = 'echo5-change-name-button';
        changeNameButton.textContent = changeNameButtonText;

        Object.assign(changeNameButton.style, {
            float: 'right',
            marginLeft: '5px', // To appear to the left of the End Chat button
            padding: '3px 8px',
            fontSize: '0.85em',
            cursor: 'pointer',
            backgroundColor: '#5bc0de', // Info color
            color: 'white',
            border: '1px solid #46b8da',
            borderRadius: '3px'
        });

        // Insert before the End Chat button if it exists, otherwise append
        const endChatButton = document.getElementById('echo5-end-chat-button');
        if (endChatButton) {
            chatHeader.insertBefore(changeNameButton, endChatButton);
        } else {
            chatHeader.appendChild(changeNameButton);
        }
        
        changeNameButton.addEventListener('click', function() {
            if (namePrompt) {
                namePrompt.style.display = 'block';
            }
            if (userNameInput) {
                userNameInput.value = userName || ''; // Pre-fill with current name
                userNameInput.focus();
            }
            if (messageInput) {
                messageInput.disabled = true;
            }
            if (sendMessageButton) {
                sendMessageButton.disabled = true;
            }
        });
    }

    /**
     * Replaces %userName% placeholder in a message template with the actual user name.
     * @param {string} template The message template.
     * @param {string} name The user's name.
     * @returns {string} The personalized message.
     */
    function getPersonalizedMessage(template, name) {
        if (!template) { 
            // Fallback if template is somehow undefined
            return `Hello, <strong>${name}</strong>! How can I help you?`; 
        }
        // Ensure name is treated as text, not HTML, when replacing.
        // The template itself may contain HTML (like <strong>), which is fine.
        const namePlaceholder = /%userName%/g;
        return template.replace(namePlaceholder, name);
    }

    /**
     * Initializes the chat: shows name prompt or welcome message.
     */
    function initializeChat() {
        console.log('initializeChat: Called. Current userName:', userName);
        // Header text DOM manipulation is now moved to echo5ChatbotInit()

        if (!userName) {
            console.log('initializeChat: No userName found, showing name prompt.');
            if (namePrompt) namePrompt.style.display = 'block';
            console.log('  namePrompt.style.display set to block');
            if (namePromptParagraph) {
                // Providing a default message if localizedData is not available.
                const promptText = localizedData.name_prompt_text || "Welcome! Please enter your name to start chatting: <br><small>You can change your name later using /name [new_name]</small>";
                namePromptParagraph.innerHTML = promptText;
            }
            if (messageInput) messageInput.disabled = true;
            console.log('  messageInput.disabled set to true');
            if (sendMessageButton) sendMessageButton.disabled = true;
            console.log('  sendMessageButton.disabled set to true');
            console.log('  userNameInput should be usable now.');
            console.log('  submitNameButton should be usable now.');
        } else {
            console.log('initializeChat: userName found:', userName, 'displaying welcome back.');
            if (chatMessages) {
                displayBotMessage(getPersonalizedMessage(welcomeBackTemplate, userName));
            }
        }
    }

    /**
     * Handles the submission of the user's name from the initial prompt.
     */
    function handleSubmitName() {
        console.log('handleSubmitName: Function defined. submitNameButton:', submitNameButton, 'userNameInput:', userNameInput);
        if (!submitNameButton || !userNameInput) return;

        submitNameButton.addEventListener('click', function () {
            console.log('handleSubmitName: Event listener for submitNameButton attached.');
            console.log('handleSubmitName: submitNameButton CLICKED!');
            const name = userNameInput.value.trim();
            console.log('handleSubmitName: Name entered:', name);
            if (name) {
                console.log('handleSubmitName: Name is valid. Hiding namePrompt, enabling inputs.');
                userName = name;
                localStorage.setItem('echo5_user_name', userName);
                if (namePrompt) namePrompt.style.display = 'none';
                console.log('  namePrompt.style.display set to none');
                if (messageInput) {
                    messageInput.disabled = false;
                    messageInput.focus();
                }
                console.log('  messageInput.disabled set to false');
                if (sendMessageButton) sendMessageButton.disabled = false;
                console.log('  sendMessageButton.disabled set to false');

                if (chatMessages) {
                    chatMessages.innerHTML = ''; // Clear previous messages
                    displayBotMessage(getPersonalizedMessage(welcomeTemplate, userName));
                }
            } else {
                alert(localizedData.enter_name_alert || 'Please enter your name.');
            }
        });
    }

    /**
     * Handles sending a message: processes /name command or displays user message.
     */
    function handleSendMessage() {
        console.log('handleSendMessage: Function defined. sendMessageButton:', sendMessageButton, 'messageInput:', messageInput);
        if (!sendMessageButton || !messageInput) return;

        sendMessageButton.addEventListener('click', function () {
            console.log('handleSendMessage: Event listener for sendMessageButton attached.');
            const messageText = messageInput.value.trim();
            if (!messageText || !userName) return;

            if (messageText.startsWith('/name ')) {
                const newName = messageText.substring(6).trim();
                if (newName) {
                    const oldName = userName;
                    userName = newName;
                    localStorage.setItem('echo5_user_name', userName);
                    let confirmMsg = localizedData.name_change_success || 'Your name has been changed from <strong>%oldName%</strong> to <strong>%newName%</strong>.';
                    confirmMsg = confirmMsg.replace(/%oldName%/g, oldName).replace(/%newName%/g, newName);
                    displayBotMessage(confirmMsg);
                } else {
                    displayBotMessage(localizedData.name_change_prompt || "Please provide a new name after the /name command. Example: /name John Doe");
                }
            } else {
                displayUserMessage(messageText, userName);

                // Disable inputs
                messageInput.disabled = true;
                sendMessageButton.disabled = true;
                sendMessageButton.textContent = 'Sending...'; // Optional: provide visual feedback

                // Prepare AJAX data
                const data = {
                    action: 'echo5_chatbot_send_message',
                    nonce: sendMessageNonce, // Use the new nonce for sending messages
                    message: messageText,
                    user_name: userName
                };

                // Perform AJAX request
                jQuery.ajax({
                    url: ajaxUrl,
                    type: 'POST',
                    data: data,
                    success: function(response) {
                        if (response.success) {
                            displayBotMessage(response.data.reply);
                        } else {
                            const errorMessage = response.data && response.data.message ? response.data.message : 'An error occurred.';
                            displayBotMessage('Error: ' + errorMessage);
                        }
                    },
                    error: function(jqXHR, textStatus, errorThrown) {
                        console.error('Echo5 Chatbot: AJAX error sending message:', textStatus, errorThrown, jqXHR.responseText);
                        displayBotMessage('Error: Could not connect to the server to send message.');
                    },
                    complete: function() {
                        // Re-enable inputs in both success and error cases
                        messageInput.disabled = false;
                        sendMessageButton.disabled = false;
                        sendMessageButton.textContent = localizedData.send_button_text || 'Send'; // Restore original button text
                        messageInput.focus();
                    }
                });
            }
            messageInput.value = ''; // Clear input field
        });

        // Allow sending message with Enter key
        messageInput.addEventListener('keypress', function (e) {
            if (e.key === 'Enter') {
                sendMessageButton.click();
            }
        });
    }
    
    /**
     * Creates and displays a user's message in the chat window.
     * Adds the message to conversation history.
     * @param {string} message The message text.
     * @param {string} name The user's name.
     */
    function displayUserMessage(message, name) {
        if (!chatMessages) return;

        const messageDiv = document.createElement('div');
        messageDiv.classList.add('echo5-message', 'echo5-user-message');
        
        const avatarImg = document.createElement('img');
        avatarImg.src = userAvatarUrl; 
        avatarImg.alt = name + " Avatar"; // Alt text for accessibility
        avatarImg.classList.add('echo5-avatar');

        const messageContentDiv = document.createElement('div');
        messageContentDiv.classList.add('echo5-message-content');
        
        // Create strong element for name and p for message to avoid direct innerHTML with user-typed content as much as possible
        const nameStrong = document.createElement('strong');
        nameStrong.textContent = name; // name is from input/localStorage, treated as text
        const messageP = document.createElement('p');
        messageP.textContent = message; // message is from input, treated as text

        messageContentDiv.appendChild(nameStrong);
        messageContentDiv.appendChild(messageP);
        
        messageDiv.appendChild(messageContentDiv); 
        messageDiv.appendChild(avatarImg); 

        chatMessages.appendChild(messageDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight; // Scroll to bottom
        
        // Add to history
        conversationHistory.push({ sender: 'user', name: name, text: message, timestamp: new Date().toISOString() });
    }

    /**
     * Creates and displays a bot's message in the chat window.
     * Adds relevant messages to conversation history.
     * @param {string} message The message text (can include HTML from trusted sources like localization).
     */
    function displayBotMessage(message) {
        if (!chatMessages) return;

        const messageDiv = document.createElement('div');
        messageDiv.classList.add('echo5-message', 'echo5-bot-message');

        const avatarImg = document.createElement('img');
        avatarImg.src = botAvatarUrl; 
        avatarImg.alt = "Bot Avatar"; // Alt text for accessibility
        avatarImg.classList.add('echo5-avatar');
        
        const messageContentDiv = document.createElement('div');
        messageContentDiv.classList.add('echo5-message-content');
        // Bot messages (including templates from admin) can contain simple HTML (e.g., <strong>).
        // This is considered safe as it's admin-controlled or bot-generated (not direct user input).
        messageContentDiv.innerHTML = `<strong>Bot</strong><p>${message.replace(/\n/g, '<br>')}</p>`;

        messageDiv.appendChild(avatarImg); 
        messageDiv.appendChild(messageContentDiv); 

        chatMessages.appendChild(messageDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight; // Scroll to bottom

        // Add to history, excluding certain status messages
        const lowerCaseMessage = typeof message === 'string' ? message.toLowerCase() : '';
        const isWelcome = lowerCaseMessage.includes("welcome");
        const isNameChange = lowerCaseMessage.includes("your name has been changed");
        const isChatEnded = lowerCaseMessage.includes("chat ended"); 
        
        if (!isWelcome && !isNameChange && !isChatEnded) {
             conversationHistory.push({ sender: 'bot', name: 'Bot', text: message, timestamp: new Date().toISOString() });
        }
    }

    /**
     * Sends the conversation history to the server via AJAX.
     */
    function sendConversationToServer() {
        if (!userName) { 
            console.warn("Echo5 Chatbot: User name not set, cannot send conversation.");
            return;
        }
        if (conversationHistory.length === 0) {
            console.info("Echo5 Chatbot: No conversation to send.");
            return;
        }
        if (!ajaxUrl || !nonce) {
            console.error("Echo5 Chatbot: AJAX URL or nonce is missing. Cannot send transcript.");
            displayBotMessage("Error: Could not send transcript due to a configuration issue.");
            return;
        }

        const data = {
            action: 'echo5_send_chat_transcript', // WordPress AJAX action
            nonce: nonce, 
            conversation: conversationHistory,
            user_name: userName,
        };

        // Using jQuery for AJAX as it's a dependency in WordPress admin and often available.
        jQuery.ajax({
            url: ajaxUrl,
            type: 'POST',
            data: data,
            success: function(response) {
                if (response.success) {
                    console.info('Echo5 Chatbot: Transcript sent successfully.', response.data.message);
                } else {
                    console.error('Echo5 Chatbot: Error sending transcript.', response.data.message);
                    displayBotMessage('Error: Could not send transcript. ' + (response.data.message || ''));
                }
            },
            error: function(jqXHR, textStatus, errorThrown) {
                console.error('Echo5 Chatbot: AJAX error sending transcript:', textStatus, errorThrown, jqXHR.responseText);
                displayBotMessage('Error: Could not send transcript due to a network or server issue.');
            }
        });
    }

    // Initialize all parts of the chat
    console.log('DOMContentLoaded: Setting up event handlers and initializing chat.');

    function echo5ChatbotInit() {
        console.log('echo5ChatbotInit: Main initialization started.');
        // 1. Set the header text first
        if (chatHeader) { // chatHeader is defined in the outer scope
            const headerH2 = chatHeader.querySelector('h2');
            if (headerH2) {
                // chatbotHeaderText is defined in the outer scope from localizedData
                headerH2.textContent = chatbotHeaderText; 
                console.log('echo5ChatbotInit: Header text set to:', chatbotHeaderText);
            } else {
                console.log('echo5ChatbotInit: headerH2 element not found.');
            }
        } else {
            console.log('echo5ChatbotInit: chatHeader element not found.');
        }

        // 2. Then, call all the setup and event listener attachment functions
        setupEndChatButton();
        setupChangeNameButton();
        initializeChat(); // This will no longer set the header text
        handleSubmitName();
        handleSendMessage();
        console.log('echo5ChatbotInit: All setup functions called.');
    }

    echo5ChatbotInit();
});
