const { getAllModules, constants, getModule, i18n: { Messages }, React } = require('powercord/webpack');
const { Clickable, Tooltip, Icon } = require('powercord/components');
const { ChannelTypes, Permissions: DiscordPermissions } = constants;
const { inject, uninject } = require('powercord/injector');
const { findInReactTree } = require('powercord/util');
const { Plugin } = require('powercord/entities');

const bulk = (...filters) => {
   let out = new Array(filters.length);
   filters = filters.map(filter => {
      if (Array.isArray(filter)) return (module) => module && filter.every(key => module[key]);
      if (typeof filter === 'string') return (module) => module?.displayName === filter;
      return filter;
   });

   getAllModules(module => {
      for (const [index, filter] of filters.entries()) {
         if (filter(module)) {
            out[index] = module;
         }
      }

      return out.filter(e => e).length === filters.length;
   });

   return out;
};

const [
   Route,
   ChannelItem,
   ChannelClasses,
   ChannelUtil,
   Permissions,
   Channel,
   { getChannel } = {},
   FetchUtil,
   { getGuild } = {},
   { iconItem, actionIcon } = {},
   UnreadStore,
   Voice
] = bulk(
   m => m.default?.displayName == 'RouteWithImpression',
   m => m.default?.displayName == 'ChannelItem',
   ['wrapper', 'mainContent'],
   ['getChannelIconComponent'],
   ['getChannelPermissions'],
   m => m.prototype?.isManaged,
   ['hasChannel'],
   ['receiveMessage'],
   ['getGuild'],
   ['iconItem'],
   ['hasAcked'],
   ['getVoiceStateStats']
);

const LockedScreen = require('./components/LockedScreen');

module.exports = class ShowHiddenChannels extends Plugin {
   async startPlugin() {
      this.patches = [];
      this.can = Permissions.__powercordOriginal_can ?? Permissions.can;

      this.loadStylesheet('style.css');

      const _this = this;
      Channel.prototype.isHidden = function () {
         return ![1, 3].includes(this.type) && !_this.can(DiscordPermissions.VIEW_CHANNEL, this);
      };

      this.patch('shc-unread', UnreadStore, 'hasUnread', (args, res) => {
         return res && !getChannel(args[0])?.isHidden();
      });

      this.patch('shc-permissions-can', Permissions, 'can', (args, res) => {
         if (args[0] == DiscordPermissions.VIEW_CHANNEL) return true;

         return res;
      });

      this.patch('shc-mention-count', UnreadStore, 'getMentionCount', (args, res) => {
         return getChannel(args[0])?.isHidden() ? 0 : res;
      });

      this.patch('shc-router', Route, 'default', (args, res) => {
         const id = res.props?.computedMatch?.params?.channelId;
         const guild = res.props?.computedMatch?.params?.guildId;

         let channel;
         if (id && guild && (channel = getChannel(id)) && channel?.isHidden?.() && channel?.id != Voice.getChannelId()) {
            res.props.render = () => <LockedScreen channel={channel} guild={getGuild(guild)} />;
         };

         return res;
      });

      Route.default.displayName = 'RouteWithImpression';

      FetchUtil._fetchMessages = FetchUtil.fetchMessages;
      FetchUtil.fetchMessages = (args) => {
         if (getChannel(args.channelId)?.isHidden?.()) return;
         return FetchUtil._fetchMessages(args);
      };

      this.patch('shc-channel-item', ChannelItem, 'default', (args, res) => {
         const instance = args[0];
         if (instance.channel?.isHidden()) {
            const item = res.props?.children?.props;
            if (item?.className) item.className += ` shc-hidden-channel shc-hidden-channel-type-${instance.channel.type}`;

            const children = res.props?.children?.props?.children[1]?.props?.children[1];
            if (children.props?.children) children.props.children = [
               <Tooltip text={Messages.CHANNEL_LOCKED_SHORT}>
                  <Clickable className={[iconItem, 'shc-lock-icon-clickable'].join(' ')} style={{ display: 'block' }}>
                     <Icon name='LockClosed' className={actionIcon} />
                  </Clickable>
               </Tooltip>
            ];

            if (instance.channel.type == ChannelTypes.GUILD_VOICE && !instance.connected) {
               const wrapper = findInReactTree(res, n => n.props?.className?.includes(ChannelClasses.wrapper));

               if (wrapper) {
                  wrapper.props.onMouseDown = () => { };
                  wrapper.props.onMouseUp = () => { };
               }

               const mainContent = findInReactTree(res, n => n.props?.className?.includes(ChannelClasses.mainContent));

               if (mainContent) {
                  mainContent.props.onClick = () => { };
                  mainContent.props.href = null;
               }
            };
         }

         return res;
      });

      ChannelItem.default.displayName = 'ChannelItem';

      this.patch('shc-channel-item-icon', ChannelUtil, 'getChannelIconComponent', (args, res) => {
         if (args[0]?.isHidden?.() && args[2]?.locked) args[2].locked = false;

         return args;
      }, true);
   }

   pluginWillUnload() {
      delete Channel.prototype.isHidden;
      FetchUtil.fetchMessages = FetchUtil._fetchMessages;
      for (const patch of this.patches) uninject(patch);
   }

   patch(...args) {
      if (!args || !args[0] || typeof args[0] !== 'string') return;
      this.patches.push(args[0]);
      return inject(...args);
   }
};
