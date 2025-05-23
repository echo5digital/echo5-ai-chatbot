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
		<h2><?php esc_html_e( 'AI Chatbot', 'echo5-ai-chatbot' ); ?></h2>
		<?php // The "End Chat" button is added here dynamically by js/echo5-chat.js ?>
	</div>
	<div id="echo5-chat-messages">
		<!-- Welcome message and chat messages will appear here, populated by JavaScript -->
	</div>
	<div id="echo5-chat-input-area">
		<input type="text" id="echo5-chat-message-input" placeholder="<?php esc_attr_e( 'Type your message...', 'echo5-ai-chatbot' ); ?>">
		<button id="echo5-send-message-button"><?php esc_html_e( 'Send', 'echo5-ai-chatbot' ); ?></button>
	</div>
	<div id="echo5-chat-name-prompt" style="display: none; padding: 10px; background-color: #f0f0f0; text-align: center;">
		<p><?php esc_html_e( 'Welcome! Please enter your name to start chatting:', 'echo5-ai-chatbot' ); ?> <?php echo '<br><small>' . esc_html__( 'Hint: You can change your name anytime using /name [your_new_name]', 'echo5-ai-chatbot' ) . '</small>'; ?></p>
		<input type="text" id="echo5-user-name-input" placeholder="<?php esc_attr_e( 'Your Name', 'echo5-ai-chatbot' ); ?>" style="width: calc(100% - 22px); margin-bottom: 10px; padding: 8px; border: 1px solid #ccc; border-radius: 3px;">
		<button type="button" id="echo5-submit-name-button" style="padding: 8px 15px; background-color: var(--echo5-chat-primary-color, #0073aa); color: white; border: none; border-radius: 3px; cursor: pointer;"><?php esc_html_e( 'Start Chat', 'echo5-ai-chatbot' ); ?></button>
	</div>
</div>
