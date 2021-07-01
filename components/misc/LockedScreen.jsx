const { React, getModule } = require('powercord/webpack');
const { Text } = require('powercord/components');

module.exports = (props) => {
   return <div className={getModule(['chat', 'chatContent'], false).chat}>
      <div style={{
         display: 'flex',
         flexDirection: 'column',
         justifyContent: 'center',
         alignItems: 'center',
         margin: 'auto',
         textAlign: 'center'
      }}>
         <img style={{ maxHeight: '128px' }} src="/assets/755d4654e19c105c3cd108610b78d01c.svg" /><br /><br />
         <Text style={{ textAlign: 'center', fontWeight: 'bold' }} color={Text.Colors.HEADER_PRIMARY} size={Text.Sizes.SIZE_32}>This is a hidden channel.</Text>
         <Text color={Text.Colors.HEADER_SECONDARY} size={Text.Sizes.SIZE_16}>You cannot see the contents of this channel.</Text>
         {props.channel.topic ? <Text color={Text.Colors.HEADER_SECONDARY} size={Text.Sizes.SIZE_14}>Topic: {`${props.channel.topic}`}</Text> : ''}
      </div>
   </div>;
};