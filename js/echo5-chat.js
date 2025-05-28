/**
 * Echo5 AI Chatbot Front-End JavaScript
 *
 * Handles chat interface interactions, user messages, bot responses (simulated),
 * name changes, and sending chat transcripts.
 *
 * @since 0.1.0
 */
document.addEventListener('DOMContentLoaded', function () {
    // DOM element references with error checking
    const elements = {
        chatContainer: document.getElementById('echo5-chat-container'),
        namePrompt: document.getElementById('echo5-chat-name-prompt'),
        userNameInput: document.getElementById('echo5-user-name-input'),
        submitNameButton: document.getElementById('echo5-submit-name-button'),
        messageInput: document.getElementById('echo5-chat-message-input'),
        sendMessageButton: document.getElementById('echo5-send-message-button'),
        chatMessages: document.getElementById('echo5-chat-messages'),
        chatHeader: document.getElementById('echo5-chat-header')
    };

    // Verify all required elements exist
    const missingElements = Object.entries(elements)
        .filter(([key, element]) => !element)
        .map(([key]) => key);

    if (missingElements.length > 0) {
        console.error('Echo5 Chatbot: Missing required DOM elements:', missingElements);
        return; // Exit initialization if elements are missing
    }

    // Debug log of found elements
    console.log('Echo5 Chatbot: All required DOM elements found:', elements);

    // Initialize variables
    let userName = localStorage.getItem('echo5_user_name');
    let isLiveAgent = false;
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

    /**
     * Adds a "Minimize Chat" button to the chat header.
     * Handles click event to minimize/maximize the chat.
     */
    function setupMinimizeButton() {
        if (!elements.chatHeader) return;

        const minimizeButton = document.createElement('button');
        minimizeButton.id = 'echo5-minimize-button';
        minimizeButton.textContent = '−'; // Initial state is maximized
        // Basic styling for the button
        Object.assign(minimizeButton.style, {
            float: 'right',
            marginLeft: '10px',
            marginRight: '5px',
            marginTop: '2px',
            marginBottom: '2px',
            padding: '3px 8px',
            fontSize: '16px',
            cursor: 'pointer',
            backgroundColor: 'transparent',
            color: 'white',
            border: '1px solid rgba(255,255,255,0.3)',
            borderRadius: '3px',
            lineHeight: '1',
            width: '30px',
            height: '30px'
        });
        
        const headerH2 = elements.chatHeader.querySelector('h2');
        if (headerH2) {
             headerH2.style.display = 'inline-block';
        }
        elements.chatHeader.appendChild(minimizeButton);

        // Set initial state based on localStorage or default to minimized on mobile
        const isMobile = window.innerWidth <= 480;
        let isMinimized = isMobile ? true : (localStorage.getItem('echo5_chat_minimized') === 'true');
        
        function updateMinimizedState() {
            if (elements.chatContainer) {
                if (isMinimized) {
                    if (isMobile) {
                        Object.assign(elements.chatContainer.style, {
                            transform: 'translateY(calc(100% - 50px))',
                            transition: 'transform 0.3s ease'
                        });
                    } else {
                        Object.assign(elements.chatContainer.style, {
                            height: '50px',
                            transition: 'height 0.3s ease'
                        });
                    }
                    minimizeButton.textContent = '+';
                } else {
                    if (isMobile) {
                        Object.assign(elements.chatContainer.style, {
                            transform: 'translateY(0)',
                            transition: 'transform 0.3s ease'
                        });
                    } else {
                        Object.assign(elements.chatContainer.style, {
                            height: '500px',
                            transition: 'height 0.3s ease'
                        });
                    }
                    minimizeButton.textContent = '−';
                }
            }
            localStorage.setItem('echo5_chat_minimized', isMinimized);
        }

        minimizeButton.addEventListener('click', function() {
            isMinimized = !isMinimized;
            updateMinimizedState();
        });

        // Apply initial state
        updateMinimizedState();
    }

    /**
     * Adds a "Change Name" button to the chat header.
     * Handles click event to show name prompt and disable chat input.
     */
    function setupChangeNameButton() {
        if (!elements.chatHeader) return;

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
            elements.chatHeader.insertBefore(changeNameButton, endChatButton);
        } else {
            elements.chatHeader.appendChild(changeNameButton);
        }
        
        changeNameButton.addEventListener('click', function() {
            if (elements.namePrompt) {
                elements.namePrompt.style.display = 'block';
            }
            if (elements.userNameInput) {
                elements.userNameInput.value = userName || ''; // Pre-fill with current name
                elements.userNameInput.focus();
            }
            if (elements.messageInput) {
                elements.messageInput.disabled = true;
            }
            if (elements.sendMessageButton) {
                elements.sendMessageButton.disabled = true;
            }
        });
    }

    // Add isLiveAgent flag at the top with other variables
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
        console.log('initializeChat: Started with userName:', userName);
        
        if (!elements.messageInput || !elements.sendMessageButton) {
            console.error('Echo5 Chatbot: Chat input elements missing!');
            return;
        }

        // Set initial states
        elements.messageInput.disabled = false;
        elements.sendMessageButton.disabled = false;
        elements.messageInput.focus();

        if (!userName) {
            console.log('initializeChat: No userName found, showing name prompt');
            elements.namePrompt.style.display = 'block';
            elements.messageInput.disabled = true;
            elements.sendMessageButton.disabled = true;
        } else {
            console.log('initializeChat: userName found, enabling chat');
            elements.namePrompt.style.display = 'none';
            elements.messageInput.disabled = false;
            elements.sendMessageButton.disabled = false;
            displayBotMessage(getPersonalizedMessage(welcomeBackTemplate, userName));
        }
    }

    /**
     * Handles the submission of the user's name from the initial prompt.
     */
    function handleSubmitName() {
        if (!elements.submitNameButton || !elements.userNameInput) {
            console.error('Echo5 Chatbot: Name submission elements missing!');
            return;
        }

        elements.submitNameButton.addEventListener('click', function() {
            const name = elements.userNameInput.value.trim();
            if (name) {
                userName = name;
                localStorage.setItem('echo5_user_name', userName);
                elements.namePrompt.style.display = 'none';
                elements.messageInput.disabled = false;
                elements.sendMessageButton.disabled = false;
                elements.messageInput.focus();
                elements.chatMessages.innerHTML = '';
                displayBotMessage(getPersonalizedMessage(welcomeTemplate, userName));
            } else {
                alert(localizedData.enter_name_alert || 'Please enter your name.');
            }
        });
    }

    /**
     * Sets up the live agent toggle functionality
     */
    function setupLiveAgentToggle() {
        const liveAgentButton = document.createElement('button');
        liveAgentButton.id = 'echo5-live-agent-button';
        liveAgentButton.textContent = 'Switch to Live Agent';
        liveAgentButton.style.cssText = `
            float: right;
            margin-left: 5px;
            padding: 3px 8px;
            font-size: 0.85em;
            cursor: pointer;
            background-color: #28a745;
            color: white;
            border: 1px solid #218838;
            border-radius: 3px;
        `;

        liveAgentButton.addEventListener('click', function() {
            isLiveAgent = !isLiveAgent;
            this.textContent = isLiveAgent ? 'Switch to AI' : 'Switch to Live Agent';
            this.style.backgroundColor = isLiveAgent ? '#dc3545' : '#28a745';
            this.style.borderColor = isLiveAgent ? '#dc3545' : '#218838';
            
            const statusMessage = isLiveAgent 
                ? "Switching to live agent mode... You'll be connected shortly."
                : "Switching back to AI assistant mode.";
            displayBotMessage(statusMessage);
        });

        if (elements.chatHeader) {
            elements.chatHeader.appendChild(liveAgentButton);
        }
    }

    /**
     * Handles sending a message: processes /name command or displays user message.
     */
    function handleSendMessage() {
        console.log('handleSendMessage: Function defined. sendMessageButton:', elements.sendMessageButton, 'messageInput:', elements.messageInput);
        if (!elements.sendMessageButton || !elements.messageInput) return;

        elements.sendMessageButton.addEventListener('click', async function () {
            console.log('handleSendMessage: Event listener for sendMessageButton attached.');
            const messageText = elements.messageInput.value.trim();
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
                elements.messageInput.disabled = true;
                elements.sendMessageButton.disabled = true;
                elements.sendMessageButton.textContent = 'Sending...'; // Optional: provide visual feedback

                // Prepare AJAX data
                const data = {
                    action: 'echo5_chatbot_send_message',
                    nonce: sendMessageNonce, // Use the new nonce for sending messages
                    message: messageText,
                    user_name: userName,
                    is_live_agent: isLiveAgent
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
                        elements.messageInput.disabled = false;
                        elements.sendMessageButton.disabled = false;
                        elements.sendMessageButton.textContent = localizedData.send_button_text || 'Send'; // Restore original button text
                        elements.messageInput.focus();
                    }
                });
            }
            elements.messageInput.value = ''; // Clear input field
        });

        // Allow sending message with Enter key
        elements.messageInput.addEventListener('keypress', function (e) {
            if (e.key === 'Enter') {
                elements.sendMessageButton.click();
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
        if (!elements.chatMessages) return;

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

        elements.chatMessages.appendChild(messageDiv);
        elements.chatMessages.scrollTop = elements.chatMessages.scrollHeight; // Scroll to bottom
        
        // Add to history
        conversationHistory.push({ sender: 'user', name: name, text: message, timestamp: new Date().toISOString() });
    }

    /**
     * Creates and displays a bot's message in the chat window.
     * Adds relevant messages to conversation history.
     * @param {string} message The message text (can include HTML from trusted sources like localization).
     */
    function displayBotMessage(message) {
        if (!elements.chatMessages) return;

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

        elements.chatMessages.appendChild(messageDiv);
        elements.chatMessages.scrollTop = elements.chatMessages.scrollHeight; // Scroll to bottom

        // Add to history, excluding certain status messages
        const lowerCaseMessage = typeof message === 'string' ? message.toLowerCase() : '';
        const isWelcome = lowerCaseMessage.includes("welcome");
        const isNameChange = lowerCaseMessage.includes("your name has been changed");
        const isChatEnded = lowerCaseMessage.includes("chat ended"); 
        
        if (!isWelcome && !isNameChange && !isChatEnded) {
             conversationHistory.push({ sender: 'bot', name: 'Bot', text: message, timestamp: new Date().toISOString() });
        }

        // Speech synthesis for bot messages
        if (isSpeechEnabled && message) {
            // Stop any current speech
            if (currentUtterance) {
                synth.cancel();
            }

            // Create and configure new utterance
            currentUtterance = new SpeechSynthesisUtterance(message.replace(/<[^>]*>/g, ''));

            // Get and set female voice
            const femaleVoice = getBestFemaleVoice();
            if (femaleVoice) {
                currentUtterance.voice = femaleVoice;
            }

            // Adjust voice characteristics for more natural female voice
            currentUtterance.rate = 1.0;
            currentUtterance.pitch = 1.2; // Slightly higher pitch for female voice
            currentUtterance.volume = 1.0;

            // Speak the message
            synth.speak(currentUtterance);
        }
    }

    // Speech synthesis setup
    const speechButton = document.getElementById('echo5-speech-toggle');
    let isSpeechEnabled = localStorage.getItem('echo5_speech_enabled') === 'true';
    const synth = window.speechSynthesis;
    let currentUtterance = null;

    // Function to get the best available female voice
    function getBestFemaleVoice() {
        let voices = synth.getVoices();
        
        // Try to find a female English voice
        let femaleVoice = voices.find(voice => 
            voice.lang.includes('en') && 
            !voice.lang.includes('en-IN') && // Avoid Indian English for better clarity
            voice.name.toLowerCase().includes('female')
        );
        
        // If no specific female voice found, try to find any voice with female indicators
        if (!femaleVoice) {
            femaleVoice = voices.find(voice => 
                voice.name.toLowerCase().match(/female|woman|girl|samantha|karen|moira|tessa|monica/i)
            );
        }
        
        // Fallback to any English voice
        if (!femaleVoice) {
            femaleVoice = voices.find(voice => voice.lang.includes('en'));
        }
        
        return femaleVoice;
    }

    // Initialize voice when voices are loaded
    synth.onvoiceschanged = function() {
        const femaleVoice = getBestFemaleVoice();
        if (femaleVoice) {
            console.log('Selected voice:', femaleVoice.name);
        } else {
            console.warn('No suitable voice found');
        }
    };

    // Update speech button state
    function updateSpeechButtonState() {
        if (speechButton) {
            speechButton.classList.toggle('active', isSpeechEnabled);
            speechButton.querySelector('.echo5-speech-icon').textContent = isSpeechEnabled ? '🔊' : '🔈';
        }
    }

    // Initialize speech button
    if (speechButton) {
        updateSpeechButtonState();
        
        speechButton.addEventListener('click', function() {
            isSpeechEnabled = !isSpeechEnabled;
            localStorage.setItem('echo5_speech_enabled', isSpeechEnabled);
            updateSpeechButtonState();
            
            // Stop current speech if disabling
            if (!isSpeechEnabled && currentUtterance) {
                synth.cancel();
            }
        });
    }

    // Stop speech when ending chat
    function stopSpeech() {
        if (currentUtterance) {
            synth.cancel();
            currentUtterance = null;
        }
    }

    // Initialize all parts of the chat
    console.log('DOMContentLoaded: Setting up event handlers and initializing chat.');

    function echo5ChatbotInit() {
        console.log('echo5ChatbotInit: Main initialization started.');
        // 1. Set the header text first
        if (elements.chatHeader) { // chatHeader is defined in the outer scope
            const headerH2 = elements.chatHeader.querySelector('h2');
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
        setupLiveAgentToggle();
        setupMinimizeButton();
        setupChangeNameButton();
        initializeChat(); // This will no longer set the header text
        handleSubmitName();
        handleSendMessage();
        console.log('echo5ChatbotInit: All setup functions called.');
    }

    // Initialize chat with error handling
    try {
        echo5ChatbotInit();
        console.log('Echo5 Chatbot: Initialization complete');
    } catch (error) {
        console.error('Echo5 Chatbot: Initialization failed!', error);
    }

    /**
     * Handle mobile-specific setup and events
     */
    function setupMobileSupport() {
        // Prevent zoom on input focus for iOS
        if (elements.messageInput) {
            elements.messageInput.style.fontSize = '16px'; // Prevents iOS zoom
        }
        if (elements.userNameInput) {
            elements.userNameInput.style.fontSize = '16px'; // Prevents iOS zoom
        }

        // Handle viewport height changes (mobile browsers address bar)
        let viewportHeight = window.innerHeight;
        window.addEventListener('resize', function() {
            if (window.innerHeight < viewportHeight) {
                // Keyboard is probably showing
                if (elements.chatContainer) {
                    elements.chatContainer.style.height = window.innerHeight + 'px';
                }
            } else {
                // Keyboard is probably hiding
                if (elements.chatContainer) {
                    elements.chatContainer.style.height = '100vh';
                }
            }
            viewportHeight = window.innerHeight;
        });

        // Double tap prevention
        if (elements.sendMessageButton) {
            elements.sendMessageButton.addEventListener('touchstart', function(e) {
                e.preventDefault();
                this.click();
            });
        }

        // Smooth scrolling for iOS
        if (elements.chatMessages) {
            elements.chatMessages.style.webkitOverflowScrolling = 'touch';
        }
    }

    // Initialize mobile support
    setupMobileSupport();

    // Modify existing chat container position for mobile
    if (window.innerWidth <= 480) {
        if (elements.chatContainer) {
            elements.chatContainer.style.position = 'fixed';
            elements.chatContainer.style.top = '0';
            elements.chatContainer.style.left = '0';
            elements.chatContainer.style.right = '0';
            elements.chatContainer.style.bottom = '0';
            elements.chatContainer.style.margin = '0';
        }
    }
});
