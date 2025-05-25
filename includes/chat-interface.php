<?php
/**
 * Chat Interface HTML structure for Echo5 AI Chatbot.
 *
 * This file provides the basic HTML layout for the chat widget.
 * It is included by the main plugin file and populated dynamically by JavaScript.
 *
 * @package Echo5_AI_Chatbot
 * @since   0.1.0
 */

// If this file is called directly, abort.
if ( ! defined( 'WPINC' ) ) {
	die( esc_html__( 'Silence is golden.', 'echo5-ai-chatbot' ) );
}
?>
<div id="echo5-chat-container">
    <div id="echo5-chat-header">
        <h2><?php esc_html_e('AI Chatbot', 'echo5-ai-chatbot'); ?></h2>
    </div>
    
    <div id="echo5-chat-messages">
        <!-- Messages will be populated by JavaScript -->
    </div>
    
    <div id="echo5-chat-input-area">
        <input type="text" 
               id="echo5-chat-message-input" 
               placeholder="<?php esc_attr_e('Type your message...', 'echo5-ai-chatbot'); ?>"
               disabled>
        <button id="echo5-speech-toggle" class="echo5-speech-button" title="<?php esc_attr_e('Toggle Speech', 'echo5-ai-chatbot'); ?>">
            <span class="echo5-speech-icon">🔊</span>
        </button>
        <button id="echo5-send-message-button" disabled>
            <?php esc_html_e('Send', 'echo5-ai-chatbot'); ?>
        </button>
    </div>

    <div id="echo5-chat-name-prompt">
        <p></p>
        <input type="text" 
               id="echo5-user-name-input" 
               placeholder="<?php esc_attr_e('Your Name', 'echo5-ai-chatbot'); ?>">
        <button id="echo5-submit-name-button">
            <?php esc_html_e('Start Chat', 'echo5-ai-chatbot'); ?>
        </button>
    </div>
</div>
