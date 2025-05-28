<?php
/**
 * AJAX Handlers for Echo5 AI Chatbot
 *
 * @package Echo5_AI_Chatbot
 * @since 0.1.0
 */

// If this file is called directly, abort.
if (!defined('WPINC')) {
    die('Direct access not allowed.');
}

/**
 * Handle incoming chat messages
 */
function echo5_chatbot_handle_message() {
    check_ajax_referer('echo5_chatbot_send_message', 'nonce');

    $message = sanitize_textarea_field($_POST['message']);
    $user_name = sanitize_text_field($_POST['user_name']);
    $is_live_agent = isset($_POST['is_live_agent']) ? (bool)$_POST['is_live_agent'] : false;

    if ($is_live_agent) {
        // Handle live agent queue/routing
        $response = array(
            'success' => true,
            'data' => array(
                'reply' => "A live agent will be with you shortly. Your position in queue: 1"
            )
        );
    } else {
        // Get OpenAI API key
        $api_key = get_option('echo5_chatbot_api_key');
        
        if (!$api_key) {
            wp_send_json_error(array('message' => 'OpenAI API key not configured.'));
            return;
        }

        // Prepare OpenAI API request
        $response = wp_remote_post('https://api.openai.com/v1/chat/completions', array(
            'headers' => array(
                'Authorization' => 'Bearer ' . $api_key,
                'Content-Type' => 'application/json',
            ),
            'body' => json_encode(array(
                'model' => 'gpt-3.5-turbo',
                'messages' => array(
                    array(
                        'role' => 'system',
                        'content' => 'You are a helpful customer service assistant.'
                    ),
                    array(
                        'role' => 'user',
                        'content' => $message
                    )
                ),
                'max_tokens' => 150,
                'temperature' => 0.7,
            )),
            'timeout' => 15
        ));

        if (is_wp_error($response)) {
            wp_send_json_error(array('message' => $response->get_error_message()));
            return;
        }

        $body = json_decode(wp_remote_retrieve_body($response), true);
        
        if (isset($body['error'])) {
            wp_send_json_error(array('message' => $body['error']['message']));
            return;
        }

        $reply = $body['choices'][0]['message']['content'];
        
        $response = array(
            'success' => true,
            'data' => array(
                'reply' => $reply
            )
        );
    }

    wp_send_json($response);
}
add_action('wp_ajax_echo5_chatbot_send_message', 'echo5_chatbot_handle_message');
add_action('wp_ajax_nopriv_echo5_chatbot_send_message', 'echo5_chatbot_handle_message');
