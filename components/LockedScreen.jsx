const { React, getModule, getModuleByDisplayName } = require('powercord/webpack');
const ChannelTopic = getModuleByDisplayName('ChannelTopic', false);
const { Text } = require('powercord/components');
const { chat } = getModule(['chat', 'chatContent'], false);

module.exports = React.memo((props) => {
   return <div className={['shc-locked-chat-content', chat].filter(Boolean).join(' ')}>
      <div className="shc-locked-notice" >
         <img
            className="shc-notice-lock"
            src="/assets/755d4654e19c105c3cd108610b78d01c.svg"
         />
         <Text
            className="shc-locked-channel-text"
            color={Text.Colors.HEADER_PRIMARY}
            size={Text.Sizes.SIZE_32}
         >
            This is a hidden channel.
         </Text>
         <Text
            className="shc-no-access-text"
            color={Text.Colors.HEADER_SECONDARY}
            size={Text.Sizes.SIZE_16}
         >
            You cannot see the contents of this channel. {props.channel.topic && 'However, you may see its topic.'}
         </Text>
         {props.channel.topic &&
            <ChannelTopic
               key={props.channel.id}
               channel={props.channel}
               guild={props.guild}
         />}
      </div>
   </div>;
});
