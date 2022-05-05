const { React, getModule, getModuleByDisplayName } = require('powercord/webpack');
const ChannelTopic = getModuleByDisplayName('ChannelTopic', false);
const { chat } = getModule(['chat', 'chatContent'], false);
const Text = getModuleByDisplayName('LegacyText', false);

module.exports = React.memo((props) => {
   return <div className={['shc-locked-chat-content', chat].filter(Boolean).join(' ')}>
      <div className='shc-locked-notice' >
         <img
            className='shc-notice-lock'
            src='/assets/755d4654e19c105c3cd108610b78d01c.svg'
         />
         <Text
            className='shc-locked-channel-text'
            color={Text.Colors.HEADER_PRIMARY}
            size={Text.Sizes.SIZE_32}
         >
            This is a hidden channel.
         </Text>
         <Text
            className='shc-no-access-text'
            color={Text.Colors.HEADER_SECONDARY}
            size={Text.Sizes.SIZE_16}
         >
            You cannot see the contents of this channel. {props.channel.topic && 'However, you may see its topic.'}
         </Text>
         {props.channel.topic && <ChannelTopic
            key={props.channel.id}
            channel={props.channel}
            guild={props.guild}
         />}
         {props.channel.lastMessageId && <Text
            color={Text.Colors.INTERACTIVE_NORMAL}
            size={Text.Sizes.SIZE_14}
         >
            Last message sent: {getDateFromSnowflake(props.channel.lastMessageId)}
         </Text>}
      </div>
   </div>;
});

function getDateFromSnowflake(number) {
   try {
      const id = parseInt(number);
      const binary = id.toString(2).padStart(64, '0');

      const excerpt = binary.substring(0, 42);
      const decimal = parseInt(excerpt, 2);
      const unix = decimal + 1420070400000;

      return new Date(unix).toLocaleString();
   } catch (e) {
      console.error(e);
      return '(Failed to get date)';
   }
}