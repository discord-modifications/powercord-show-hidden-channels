const { inject, uninject } = require('powercord/injector');
const { findInReactTree, getOwnerInstance, waitFor } = require('powercord/util');
const { Tooltip } = require('powercord/components');
const { Plugin } = require('powercord/entities');
const {
   getModuleByDisplayName,
   constants: { ChannelTypes },
   getModule,
   i18n: { Messages },
   React
} = require('powercord/webpack');

const NavigableChannels = getModule(m => m.default?.displayName == 'NavigableChannels', false);
const GuildContextMenu = getModule(m => m.default?.displayName === 'GuildContextMenu', false);
const Route = getModule(m => m.default?.displayName == 'RouteWithImpression', false);
const ChannelItem = getModule(m => m.default?.displayName == 'ChannelItem', false);
const { getMutableGuildChannels } = getModule(['getMutableGuildChannels'], false);
const { container } = getModule(['container', 'subscribeTooltipButton'], false);
const DiscordPermissions = getModule(['Permissions'], false).Permissions;
const { getCurrentUser } = getModule(['getCurrentUser'], false);
const Channel = getModule(m => m.prototype?.isManaged, false);
const Clickable = getModuleByDisplayName('Clickable', false);
const CategoryUtil = getModule(['categoryCollapse'], false);
const { getChannels } = getModule(['getChannels'], false);
const Permissions = getModule(['getHighestRole'], false);
const CategoryStore = getModule(['isCollapsed'], false);
const { getChannel } = getModule(['getChannel'], false);
const { actionIcon } = getModule(['actionIcon'], false);
const { getMember } = getModule(['getMember'], false);
const FetchUtil = getModule(['fetchMessages'], false);
const { getGuild } = getModule(['getGuild'], false);
const { iconItem } = getModule(['iconItem'], false);
const UnreadStore = getModule(['hasUnread'], false);
const Menu = getModule(['MenuItem'], false);

const LockedScreen = require('./components/misc/LockedScreen');
const Settings = require('./components/settings/Settings');
const LockIcon = require('./components/icons/Lock');

const types = {
   GUILD_TEXT: 'SELECTABLE',
   GUILD_VOICE: 'VOCAL',
   GUILD_ANNOUNCEMENT: 'SELECTABLE',
   GUILD_STORE: 'SELECTABLE',
};

const defaults = {
   GUILD_TEXT: true,
   GUILD_VOICE: true,
   GUILD_ANNOUNCEMENT: true,
   GUILD_STORE: true,
   GUILD_STAGE_VOICE: true
};

module.exports = class ShowHiddenChannels extends Plugin {
   async startPlugin() {
      this.patches = [];
      this.cache = {};
      this.collapsed = [];
      this.lastGuild = null;

      this.loadStylesheet('style.css');

      powercord.api.settings.registerSettings('show-hidden-channels', {
         category: this.entityID,
         label: 'Show Hidden Channels',
         render: (props) => <Settings {...Object.assign(props, { update: this.forceUpdateAll.bind(this) })} />
      });

      Channel.prototype.isHidden = function () {
         return !Permissions.can({ data: 1024n }, this);
      };

      this.patch('shc-unread', UnreadStore, 'hasUnread', (args, res) => {
         return res && !getChannel(args[0]).isHidden();
      });

      this.patch('shc-mention-count', UnreadStore, 'getMentionCount', (args, res) => {
         return getChannel(args[0])?.isHidden() ? 0 : res;
      });

      this.patch('shc-router', Route, 'default', (args, res) => {
         let id = res.props?.computedMatch?.params?.channelId;
         let guild = res.props?.computedMatch?.params?.guildId;
         let channel;
         if (id && guild && (channel = getChannel(id)) && channel?.isHidden?.()) {
            res.props.render = () => <LockedScreen channel={channel} guild={getGuild(guild)} />;
         };

         return res;
      });
      Route.default.displayName = 'RouteWithImpression';

      FetchUtil._fetchMessages = FetchUtil.fetchMessages;
      FetchUtil.fetchMessages = ((args) => {
         if (getChannel(args.channelId).isHidden()) return;
         return FetchUtil._fetchMessages(args);
      }).bind(this);

      this.patch('shc-is-collapsed', CategoryStore, 'isCollapsed', (args, res) => {
         if (args[0]?.endsWith('hidden')) {
            if (this.settings.get('alwaysCollapse', false) && args[0] != this.lastGuild && !this.collapsed.includes(args[0])) {
               this.collapsed.push(args[0]);
               this.settings.set('collapsed', this.collapsed);
            }
            this.lastGuild = args[0];
            return this.collapsed.includes(args[0]);
         }
         return res;
      });

      this.patch('shc-category-collapse', CategoryUtil, 'categoryCollapse', (args, res) => {
         if (args[0]?.endsWith('hidden')) {
            if (!this.collapsed.includes(args[0])) {
               this.collapsed.push(args[0]);
               this.settings.set('collapsed', this.collapsed);
            }
         }

         return args;
      }, true);

      this.patch('shc-category-expand', CategoryUtil, 'categoryExpand', (args, res) => {
         if (args[0] && args[0].endsWith('hidden')) {
            if (!this.collapsed.includes(args[0])) {
               this.collapsed.push(args[0]);
               this.settings.set('collapsed', this.collapsed);
            } else {
               this.collapsed = this.collapsed.filter(c => c !== args[0]);
               this.settings.set('collapsed', this.collapsed);
            }
         }

         return args;
      }, true);

      this.patch('shc-navigable-channels', NavigableChannels, 'default', (args, res) => {
         let props = res.props?.children?.props;
         if (!props) return res;

         let { guild } = props;
         if (this.settings.get('blacklistedGuilds', []).includes(guild.id)) return res;
         let [channels, amount] = this.getHiddenChannels(guild);


         if (amount) {
            props.categories = Object.assign({}, props.categories);
            for (let cat in props.categories) {
               props.categories[cat] = [].concat(props.categories[cat]);
            }

            props.channels = Object.assign({}, props.channels);
            for (let type in props.channels) {
               props.channels[type] = [].concat(props.channels[type]);
            }

            let hiddenId = `${props.guild.id}_hidden`;

            const { GUILD_CATEGORY } = ChannelTypes;
            delete props.categories[hiddenId];
            props.categories._categories = props.categories._categories.filter(n => n.channel.id != hiddenId);
            props.channels[GUILD_CATEGORY] = props.channels[GUILD_CATEGORY].filter(n => n.channel.id != hiddenId);

            let index = -1;
            for (let catId in props.categories) {
               if (catId != '_categories') {
                  let cat = props.categories[catId];
                  cat = cat.filter(n => !n.channel.isHidden());
               }

               for (let channelObj of props.categories[catId]) {
                  if (channelObj.index > index) index = parseInt(channelObj.index);
               }
            }

            let hiddenCategory = null;
            if (!this.settings.get('sortNative', true)) {
               hiddenCategory = new Channel({
                  guild_id: props.guild.id,
                  id: hiddenId,
                  name: 'hidden',
                  type: GUILD_CATEGORY
               });

               props.categories[hiddenId] = [];
               props.categories._categories.push({
                  channel: hiddenCategory,
                  index: ++index
               });

               const categories = props.channels[GUILD_CATEGORY];
               categories.push({
                  comparator: (categories[categories.length - 1] || { comparator: 0 }).comparator + 1,
                  channel: hiddenCategory
               });
            }

            for (let type in channels) {
               let channelType = types[ChannelTypes[type]] || type;
               if (!Array.isArray(props.channels[channelType])) props.channels[channelType] = [];

               for (let channel of channels[type]) {
                  let hidden = new Channel(Object.assign({}, channel, {
                     parent_id: hiddenCategory ? hiddenId : channel.parent_id
                  }));

                  let parent_id = hidden.parent_id || 'null';

                  props.categories[parent_id].push({
                     channel: hidden,
                     index: hidden.position
                  });

                  props.channels[channelType].push({
                     comparator: hidden.position,
                     channel: hidden
                  });
               }
            }

            for (let parent in props.categories) {
               this.sortArray(props.categories[parent], 'index');
            }
            for (let channelType in props.channels) {
               this.sortArray(props.channels[channelType], 'comparator');
            }
         }

         return res;
      });
      NavigableChannels.default.displayName = 'NavigableChannels';

      this.patch('shc-channel-item', ChannelItem, 'default', (args, res) => {
         let instance = args[0];
         if (instance.channel?.isHidden()) {
            let item = res.props?.children?.props;
            if (item?.className) item.className += ` shc-hidden-channel shc-hidden-channel-type-${instance.channel.type}`;

            let children = res.props?.children?.props?.children[1]?.props?.children[1];
            if (children.props?.children) children.props.children = [
               <Tooltip text={Messages.CHANNEL_LOCKED_SHORT}>
                  <Clickable className={iconItem} style={{ display: 'block' }}>
                     <LockIcon className={actionIcon} />
                  </Clickable>
               </Tooltip>
            ];
         }

         return res;
      });
      ChannelItem.default.displayName = 'ChannelItem';

      this.patch('shc-context-menu', GuildContextMenu, 'default', ([{ guild }], res) => {
         this.processContextMenu(res, guild);

         return res;
      });
      GuildContextMenu.default.displayName = 'GuildContextMenu';

      this.forceUpdateAll();
   }

   pluginWillUnload() {
      delete Channel.prototype.isHidden;
      FetchUtil.fetchMessages = FetchUtil._fetchMessages;
      powercord.api.settings.unregisterSettings('show-hidden-channels');
      for (const patch of this.patches) uninject(patch);
      this.forceUpdateAll();
   }

   processContextMenu(res, guild) {
      let settings = this.settings.get('blacklistedGuilds', []);
      let [checked, setChecked] = React.useState(settings.includes(guild.id));
      if (!findInReactTree(res, c => c.props?.id == 'hide-locked-channels')) {
         let menuItems = findInReactTree(res, c => Array.isArray(c) && c.find?.(a => a?.props?.id == 'hide-muted-channels'));
         let index = menuItems?.indexOf(menuItems.find(c => c?.props?.id == 'hide-muted-channels'));

         if (index > -1) {
            menuItems.splice(index + 1, 0,
               <Menu.MenuCheckboxItem
                  id='hide-locked-channels'
                  label='Hide Locked Channels'
                  checked={checked}
                  action={() => {
                     setChecked(!checked);
                     if (!checked && !settings.includes(guild.id)) {
                        settings.push(guild.id);
                        this.settings.set('blacklistedGuilds', settings);
                     } else if (checked) {
                        let index = settings.findIndex(g => g == guild.id);
                        if (index > -1) this.settings.set('blacklistedGuilds', settings.splice(index, 0));
                     };
                     this.forceUpdateAll();
                  }}
               />
            );
         }
      }

      return res;
   }

   sortArray(array, key, except = null) {
      return array.sort((x, y) => {
         let xValue = x[key], yValue = y[key];
         if (xValue !== except) return xValue < yValue ? -1 : xValue > yValue ? 1 : 0;
      });
   }

   getHiddenChannels(guild) {
      if (!guild) return [{}, 0];
      let channels = {};

      let roles = (getMember(guild.id, getCurrentUser().id) || { roles: [] }).roles.length;
      let visible = (getChannels(guild.id) || { count: 0 });

      if (
         !this.cache[guild.id] ||
         this.cache[guild.id].visible != visible ||
         this.cache[guild.id].roles != roles
      ) {
         let all = getMutableGuildChannels();

         for (let type in ChannelTypes) {
            if (!Number.isNaN(Number(ChannelTypes[type]))) {
               channels[ChannelTypes[type]] = [];
            }
         }

         for (let id in all) {
            let channel = all[id];
            if (
               channel.guild_id == guild.id &&
               channel.type != ChannelTypes.GUILD_CATEGORY &&
               channel.type != ChannelTypes.DM &&
               !Permissions.can(DiscordPermissions.VIEW_CHANNEL, channel) &&
               this.settings.get('channels', defaults)[ChannelTypes[channel.type]]
            ) channels[channel.type].push(channel);
         }

         for (let type in channels) {
            channels[type] = channels[type].filter(c => getChannel(c.id));
         }

         this.cache[guild.id] = {
            hidden: channels,
            amount: Object.entries(channels).map(m => m[1]).flat().length,
            visible,
            roles
         };
      }

      return [this.cache[guild.id].hidden, this.cache[guild.id].amount];
   }

   forceUpdateAll() {
      this.cache = {};
      let channels = document.querySelector(`.${container}`);
      if (channels) {
         let instance = getOwnerInstance(channels);
         instance?.forceUpdate();
      };
   }

   patch(...args) {
      if (!args || !args[0] || typeof args[0] !== 'string') return;
      this.patches.push(args[0]);
      return inject(...args);
   }
};