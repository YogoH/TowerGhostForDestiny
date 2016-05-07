tgd.moveItemPositionHandler = function(element, item) {
    tgd.localLog("moveItemPositionHandler");
    if (app.destinyDbMode() === true) {
        tgd.localLog("destinyDbMode");
        window.open(item.href, tgd.openTabAs);
        return false;
    } else if (app.loadoutMode() === true) {
        tgd.localLog("loadoutMode");
        var existingItem, itemFound = false;
        if (item._id > 0) {
            existingItem = _.findWhere(app.activeLoadout().ids(), {
                id: item._id
            });
            if (existingItem) {
                app.activeLoadout().ids.remove(existingItem);
                itemFound = true;
            }
        } else {
            existingItem = _.filter(app.activeLoadout().generics(), function(itm) {
                return item.id == itm.hash && item.characterId() == itm.characterId;
            });
            if (existingItem.length > 0) {
                app.activeLoadout().generics.removeAll(existingItem);
                itemFound = true;
            }
        }
        if (itemFound === false) {
            if (item.transferStatus >= 2 && item.bucketType != "Subclasses") {
                $.toaster({
                    priority: 'danger',
                    title: 'Warning',
                    message: app.activeText().unable_create_loadout_for_type,
                    settings: {
                        timeout: tgd.defaults.toastTimeout
                    }
                });
            } else if (item._id === "0") {
                app.activeLoadout().addGenericItem({
                    hash: item.id,
                    bucketType: item.bucketType,
                    characterId: item.characterId()
                });
            } else if (_.where(app.activeLoadout().items(), {
                    bucketType: item.bucketType
                }).length < 10) {
                app.activeLoadout().addUniqueItem({
                    id: item._id,
                    bucketType: item.bucketType,
                    doEquip: false
                });
            } else {
                $.toaster({
                    priority: 'danger',
                    title: 'Error',
                    message: app.activeText().unable_to_create_loadout_for_bucket + item.bucketType,
                    settings: {
                        timeout: tgd.defaults.toastTimeout
                    }
                });
            }
        }
    } else {
        tgd.localLog("else");
        app.activeItem(item);
        var $movePopup = $("#move-popup");
        //TODO: Investigate how to allow Gunsmith weapons to be equipped and avoid this clause
        if ((item.transferStatus >= 2 && item.bucketType != "Subclasses") || item.bucketType == "Post Master" || item.bucketType == "Messages" || item.bucketType == "Invisible" || item.bucketType == "Lost Items" || item.bucketType == "Bounties" || item.bucketType == "Mission" || item.typeName == "Armsday Order") {
            $.toaster({
                priority: 'danger',
                title: 'Error',
                message: app.activeText().unable_to_move_bucketitems,
                settings: {
                    timeout: tgd.defaults.toastTimeout
                }
            });
            return;
        }
        if (element == tgd.activeElement) {
            $movePopup.hide();
            tgd.activeElement = null;
            tgd.localLog("hide");
        } else {
            tgd.localLog("show");
            tgd.activeElement = element;
            $ZamTooltips.hide();
            if (window.isMobile) {
                $("body").css("padding-bottom", $movePopup.height() + "px");
                /* bringing back the delay it's sitll a problem in issue #128 */
                setTimeout(function() {
                    $movePopup.show().addClass("mobile");
                }, 50);
            } else {
                tgd.localLog("display");
                $movePopup.removeClass("navbar navbar-default navbar-fixed-bottom").addClass("desktop").show().position({
                    my: "left bottom",
                    at: "left top",
                    collision: "none",
                    of: element,
                    using: function(pos, ui) {
                        var obj = $(this),
                            box = $(ui.element.element).find(".move-popup").width();
                        obj.removeAttr('style');
                        if (box + pos.left > $(window).width()) {
                            pos.left = pos.left - box;
                        }
                        obj.css(pos).width(box);
                    }
                });
            }
        }
    }
};

var Item = function(model, profile) {
    var self = this;

    if (model && model.id) {
        model.equipRequiredLevel = 0;
        model.isEquipment = true;
    }

    /* TODO: Determine why this is needed */
    _.each(model, function(value, key) {
        self[key] = value;
    });

    this.character = profile;

    this.init(model);

    this.characterId = ko.observable(self.character.id);
    this.isFiltered = ko.observable(false);
    this.isVisible = ko.pureComputed(this._isVisible, this);
    this.columnMode = ko.computed(this._columnMode, this);
    this.opacity = ko.computed(this._opacity, this);
    this.primaryStatValue = ko.pureComputed(this._primaryStatValue, this);
    this.maxLightPercent = ko.pureComputed(function() {
        var toggle = app.cspToggle();
        return Math.round((self.primaryValues.MaxLightCSP / tgd.DestinyMaxCSP[self.bucketType]) * 100);
    });
    this.cspStat = ko.pureComputed(this._cspStat, this);
    this.cspClass = ko.pureComputed(this._cspClass, this);
};

Item.prototype = {
    init: function(item) {
        var self = this;
        var info = {};
        if (item.itemHash in _itemDefs) {
            info = _itemDefs[item.itemHash];
        } else if (item.id in _itemDefs) {
            item.itemHash = item.id;
            info = _itemDefs[item.id];
        } else {
            /* Classified Items */
            info = {
                bucketTypeHash: "1498876634",
                itemName: "Classified",
                tierTypeName: "Exotic",
                icon: "/img/misc/missing_icon.png",
                itemTypeName: "Classified"
            };
            tgd.localLog("found an item without a definition! " + JSON.stringify(item));
            tgd.localLog(item.itemHash);
        }
        if (info.bucketTypeHash in tgd.DestinyBucketTypes) {
            //some weird stuff shows up under this bucketType w/o this filter
            if (info.bucketTypeHash == "2422292810" && info.deleteOnAction === false) {
                return;
            }
            var description, tierTypeName, itemDescription, itemTypeName, bucketType;
            try {
                description = decodeURIComponent(info.itemName);
                tierTypeName = decodeURIComponent(info.tierTypeName);
                itemDescription = decodeURIComponent(info.itemDescription);
                itemTypeName = decodeURIComponent(info.itemTypeName);
            } catch (e) {
                description = info.itemName;
                tierTypeName = info.tierTypeName;
                itemDescription = info.itemDescription;
                itemTypeName = info.itemTypeName;
            }
            info.icon = (info.icon === "") ? "/img/misc/missing_icon.png" : info.icon;
            bucketType = item.bucketType || self.character.getBucketTypeHelper(item, info);
            $.extend(self, {
                id: item.itemHash,
                href: "https://destinydb.com/items/" + item.itemHash,
                _id: item.itemInstanceId,
                characterId: ko.observable(self.character.id),
                isEquipped: ko.observable(),
                locked: ko.observable(),
                bonusStatOn: ko.observable(),
                primaryStat: ko.observable(),
                damageType: item.damageType,
                damageTypeName: tgd.DestinyDamageTypes[item.damageType],
                isEquipment: item.isEquipment,
                isGridComplete: item.isGridComplete,
                description: description,
                itemDescription: itemDescription,
                classType: info.classType,
                bucketType: bucketType,
                type: info.itemSubType,
                typeName: itemTypeName,
                tierType: info.tierType,
                tierTypeName: tierTypeName,
                icon: tgd.dataDir + info.icon,
                maxStackSize: info.maxStackSize,
                equipRequiredLevel: item.equipRequiredLevel,
                canEquip: item.canEquip,
                weaponIndex: tgd.DestinyWeaponPieces.indexOf(bucketType),
                armorIndex: tgd.DestinyArmorPieces.indexOf(bucketType),
                transferStatus: item.transferStatus,
                backgroundPath: (itemTypeName == "Emblem") ? app.makeBackgroundUrl(info.secondaryIcon) : "",
                actualBucketType: _.reduce(tgd.DestinyLayout, function(memo, layout) {
                    if ((layout.bucketTypes.indexOf(bucketType) > -1 && layout.extras.indexOf(bucketType) == -1) || (layout.bucketTypes.indexOf(bucketType) == -1 && layout.extras.indexOf(bucketType) > -1))
                        memo = layout.array;
                    return memo;
                }, "")
            });
            self.updateItem(item);
        }
    },
    updateItem: function(item) {
        var self = this;
        var info = {};
        if (item.itemHash in _itemDefs) {
            info = _itemDefs[item.itemHash];
        } else {
            /* Classified Items */
            info = {
                bucketTypeHash: "1498876634",
                itemName: "Classified",
                tierTypeName: "Exotic",
                icon: "/img/misc/missing_icon.png",
                itemTypeName: "Classified"
            };
            tgd.localLog("found an item without a definition! " + JSON.stringify(item));
            tgd.localLog(item.itemHash);
        }
        var bucketType = item.bucketType || self.character.getBucketTypeHelper(item, info);
        var primaryStat = self.parsePrimaryStat(item, bucketType);
        self.primaryStat(primaryStat);
        self.isEquipped(item.isEquipped);
        self.locked(item.locked);
        self.perks = self.parsePerks(item.id, item.talentGridHash, item.perks, item.nodes, item.itemInstanceId);
        var statPerks = _.where(self.perks, {
            isStat: true
        });
        self.hasLifeExotic = _.where(self.perks, {
            name: "The Life Exotic"
        }).length > 0;
        var bonus = (statPerks.length === 0) ? 0 : tgd.bonusStatPoints(self.armorIndex, primaryStat);
        self.stats = self.parseStats(self.perks, item.stats, item.itemHash);
        self.rolls = self.normalizeRolls(self.stats, statPerks, primaryStat, bonus, "");
        self.futureRolls = self.calculateFutureRolls(self.stats, statPerks, primaryStat, self.armorIndex, bonus, bucketType, this.description);
        var hasUnlockedStats = _.where(statPerks, {
            active: true
        }).length > 0;
        self.bonusStatOn(hasUnlockedStats ? _.findWhere(statPerks, {
            active: true
        }).name : "");
        self.hasUnlockedStats = hasUnlockedStats || statPerks.length === 0;
        self.progression = _.filter(self.perks, function(perk) {
            return perk.active === false && perk.isExclusive === -1;
        }).length === 0;
        self.perksInProgress = _.filter(self.perks, function(perk) {
            return perk.active === false && perk.isExclusive === -1;
        }).length === 0;
        self.primaryValues = {
            CSP: tgd.sum(_.values(self.stats)),
            bonus: bonus,
            Default: primaryStat
        };
        self.primaryValues.MaxLightCSP = Math.round(tgd.calculateStatRoll(self, tgd.DestinyLightCap, true));
    },
    calculateFutureRolls: function(stats, statPerks, primaryStat, armorIndex, currentBonus, bucketType, description) {
        var futureRolls = [];
        if (statPerks.length === 0) {
            futureRolls = [stats];
        } else {
            var futureBonus = tgd.bonusStatPoints(armorIndex, tgd.DestinyLightCap);
            var allStatsLocked = _.where(statPerks, {
                active: true
            }).length === 0;
            futureRolls = _.map(statPerks, function(statPerk) {
                var tmp = _.clone(stats);
                var isStatActive = statPerk.active;
                //Figure out the stat name of the other node
                var otherStatName = _.reduce(stats, function(memo, stat, name) {
                    return (name != statPerk.name && stat > 0) ? name : memo;
                }, '');
                //Normalize stats by removing the bonus stat 
                tmp[isStatActive ? statPerk.name : otherStatName] = tmp[isStatActive ? statPerk.name : otherStatName] - (allStatsLocked ? 0 : currentBonus);
                //Figure out the sum of points and the weight of each side
                var sum = tgd.sum(tmp),
                    weight = (tmp[statPerk.name] / sum),
                    currentStatValue = sum * weight,
                    otherStatValue = sum * (1 - weight);
                //Calculate both stats at Max Light (LL320) with bonus
                //TODO: figure out a way to consolidate this equation into tgd.calculateStatRoll
                //tmp[statPerk.name] = Math.round((sum * tgd.DestinyLightCap / primaryStat) * weight) + futureBonus; //(allStatsLocked || isStatActive ? futureBonus : 0);
                tmp[statPerk.name] = Math.round(currentStatValue + ((tgd.DestinyLightCap - primaryStat) * tgd.DestinyInfusionRates[bucketType])) + futureBonus;
                tmp["bonusOn"] = statPerk.name;
                if (otherStatName !== "") {
                    //tmp[otherStatName] = Math.round((sum * tgd.DestinyLightCap / primaryStat) * (1 - weight));
                    tmp[otherStatName] = Math.round(otherStatValue + ((tgd.DestinyLightCap - primaryStat) * tgd.DestinyInfusionRates[bucketType]));
                }
                return tmp;
            });
            /*if ( description == "Graviton Forfeit" ){
            	console.log(description, stats, statPerks, primaryStat, currentBonus, futureBonus, futureRolls);
				//abort;
            }*/
        }
        return futureRolls;
    },
    normalizeRolls: function(stats, statPerks, primaryStat, bonus, description) {
        var arrRolls = [];
        if (statPerks.length === 0) {
            arrRolls = [stats];
        } else {
            var hasUnlockedStats = _.where(statPerks, {
                active: true
            }).length > 0;

            arrRolls = _.map(statPerks, function(statPerk) {
                var tmp = _.clone(stats);
                tmp["bonusOn"] = statPerk.name;
                if (hasUnlockedStats && statPerk.active === false) {
                    var otherStatName = _.reduce(stats, function(memo, stat, name) {
                        return (name != statPerk.name && stat > 0) ? name : memo;
                    }, '');
                    tmp[otherStatName] = tmp[otherStatName] - bonus;
                    tmp[statPerk.name] = tmp[statPerk.name] + bonus;
                } else if (hasUnlockedStats === false) {
                    tmp[statPerk.name] = tmp[statPerk.name] + bonus;
                }
                return tmp;
            });
            /*if ( description == "Jasper Carcanet" ){
            	console.log(description, stats, statPerks, primaryStat, bonus, arrRolls);
            }*/
        }
        return arrRolls;
    },
    parsePrimaryStat: function(item, bucketType) {
        var primaryStat = "";
        if (item.primaryStat) {
            if (item.primaryStat && item.primaryStat.value) {
                primaryStat = item.primaryStat.value;
            } else {
                primaryStat = item.primaryStat;
            }
        }
        if (item && item.objectives && item.objectives.length > 0) {
            var progress = (tgd.average(_.map(item.objectives, function(objective) {
                var result = 0;
                if (objective.objectiveHash in _objectiveDefs && _objectiveDefs[objective.objectiveHash] && _objectiveDefs[objective.objectiveHash].completionValue) {
                    result = objective.progress / _objectiveDefs[objective.objectiveHash].completionValue;
                }
                return result;
            })) * 100).toFixed(0) + "%";
            primaryStat = (primaryStat === "") ? progress : primaryStat + "/" + progress;
        }
        if (bucketType == "Materials" || bucketType == "Consumables" || ((bucketType == "Lost Items" || bucketType == "Invisible") && item.stackSize > 1)) {
            primaryStat = item.stackSize;
        }
        return primaryStat;
    },
    parseStats: function(perks, stats, itemHash) {
        var parsedStats = {};
        if (stats && stats.length && stats.length > 0) {
            _.each(stats, function(stat) {
                if (stat.statHash in window._statDefs) {
                    var p = window._statDefs[stat.statHash];
                    parsedStats[p.statName] = stat.value;
                }
            });
            //Truth has a bug where it displays a Mag size of 2 when it's actually 3, all other RL don't properly reflect the mag size of 3 when Tripod is enabled
            if (_.findWhere(perks, {
                    name: "Tripod",
                    active: true
                }) || [1274330686, 2808364178].indexOf(itemHash) > -1) {
                parsedStats.Magazine = 3;
            }
        }
        //this is for the static share site
        else if (_.isObject(stats)) {
            parsedStats = stats;
        }
        return parsedStats;
    },
    parsePerks: function(id, talentGridHash, perks, nodes, itemInstanceId) {
        var parsedPerks = [];
        if (id) {
            parsedPerks = perks;
        } else if (_.isArray(perks) && perks.length > 0) {
            var talentGrid = _talentGridDefs[talentGridHash];
            if (talentGrid && talentGrid.nodes) {
                _.each(perks, function(perk) {
                    if (perk.perkHash in window._perkDefs) {
                        var isInherent, p = window._perkDefs[perk.perkHash];
                        //There is an inconsistency between perkNames in Destiny for example:
                        /* Boolean Gemini - Has two perks David/Goliath which is also called One Way/Or Another
                           This type of inconsistency leads to issues with filtering therefore p.perkHash must be used
                        */
                        var nodeIndex = talentGrid.nodes.indexOf(
                            _.filter(talentGrid.nodes, function(o) {
                                return _.flatten(_.pluck(o.steps, 'perkHashes')).indexOf(p.perkHash) > -1;
                            })[0]
                        );
                        if (nodeIndex > 0) {
                            isInherent = _.reduce(talentGrid.nodes[nodeIndex].steps, function(memo, step) {
                                if (memo === false) {
                                    var isPerk = _.values(step.perkHashes).indexOf(p.perkHash) > -1;
                                    if (isPerk && step.activationRequirement.gridLevel === 0) {
                                        memo = true;
                                    }
                                }
                                return memo;
                            }, false);
                        }
                        var description = p && p.displayDescription ? p.displayDescription : "";
                        parsedPerks.push({
                            iconPath: tgd.dataDir + p.displayIcon,
                            name: p.displayName,
                            description: '<strong>' + p.displayName + '</strong>: ' + description,
                            active: perk.isActive,
                            isExclusive: talentGrid.exclusiveSets.indexOf(nodeIndex),
                            isInherent: isInherent,
                            isVisible: true,
                            hash: p.perkHash
                        });
                    }
                });
                var statNames = _.pluck(tgd.DestinyArmorStats, 'statName'),
                    perkHashes = _.pluck(parsedPerks, 'hash'),
                    perkNames = _.pluck(parsedPerks, 'name'),
                    talentPerks = {};
                var talentGridNodes = talentGrid.nodes;
                _.each(nodes, function(node) {
                    if (node.hidden === false) {
                        var nodes = _.findWhere(talentGridNodes, {
                            nodeHash: node.nodeHash
                        });
                        if (nodes && nodes.steps && _.isArray(nodes.steps)) {
                            var perk = nodes.steps[node.stepIndex];
                            var isSkill = _.intersection(perk.nodeStepName.split(" "), statNames);
                            if (isSkill.length === 0 &&
                                (tgd.DestinyUnwantedNodes.indexOf(perk.nodeStepName) == -1) &&
                                (perkNames.indexOf(perk.nodeStepName) == -1) &&
                                (perk.perkHashes.length === 0 || perkHashes.indexOf(perk.perkHashes[0]) === -1)) {
                                talentPerks[perk.nodeStepName] = {
                                    active: node.isActivated,
                                    name: perk.nodeStepName,
                                    description: '<strong>' + perk.nodeStepName + '</strong>: ' + perk.nodeStepDescription,
                                    iconPath: tgd.dataDir + perk.icon,
                                    isExclusive: -1,
                                    hash: perk.icon.match(/icons\/(.*)\.png/)[1],
                                    isVisible: node.isActivated
                                };
                            } else if (isSkill.length > 0) {
                                var statName = isSkill[0];
                                talentPerks[statName] = {
                                    active: node.isActivated === true && [7, 1].indexOf(node.state) == -1,
                                    name: statName,
                                    description: "",
                                    iconPath: "",
                                    isExclusive: -1,
                                    isVisible: false,
                                    isStat: true,
                                    hash: _.findWhere(tgd.DestinyArmorStats, {
                                        statName: statName
                                    })
                                };
                            }
                        }
                    }
                });
                _.each(talentPerks, function(perk) {
                    parsedPerks.push(perk);
                });
            }
        }
        return parsedPerks;
    },
    _opacity: function() {
        return (this.equipRequiredLevel <= this.character.level() || this.character.id == 'Vault') ? 1 : 0.3;
    },
    _columnMode: function() {
        var self = this;
        var className = "";
        if (self.characterId() == 'Vault') {
            className = 'col-xs-' + app.vaultColumns();
        } else if (tgd.DestinyBucketColumns[self.bucketType] == 4) {
            className = 'col-xs-' + (tgd.bootstrapGridColumns / 4);
        } else {
            className = 'col-xs-' + (tgd.bootstrapGridColumns / 3);
        }
        if (self.isGridComplete) {
            className += ' complete';
        }
        return className;
    },
    isEquippable: function(avatarId) {
        var self = this;
        return ko.pureComputed(function() {
            //rules for how subclasses can be equipped
            var equippableSubclass = (self.bucketType == "Subclasses" && !self.isEquipped() && self.character.id == avatarId) || self.bucketType !== "Subclasses";
            //if it's in this character and it's equippable
            return (self.characterId() == avatarId && !self.isEquipped() && avatarId !== 'Vault' && self.bucketType != 'Materials' && self.bucketType != 'Consumables' && self.description.indexOf("Engram") == -1 && self.typeName.indexOf("Armsday") == -1 && equippableSubclass) || (self.characterId() != avatarId && avatarId !== 'Vault' && self.bucketType != 'Materials' && self.bucketType != 'Consumables' && self.description.indexOf("Engram") == -1 && equippableSubclass && self.transferStatus < 2);
        });
    },
    isStoreable: function(avatarId) {
        var self = this;
        return ko.pureComputed(function() {
            return (self.characterId() != avatarId && avatarId !== 'Vault' && self.bucketType !== 'Subclasses' && self.transferStatus < 2) ||
                (self.isEquipped() && self.character.id == avatarId);
        });
    },
    clone: function() {
        var self = this;
        var model = {};
        for (var i in self) {
            if (self.hasOwnProperty(i)) {
                var val = ko.unwrap(self[i]);
                if (typeof(val) !== 'function') {
                    model[i] = val;
                }
            }
        }
        //tgd.localLog("model: ");
        //tgd.localLog(model);
        var newItem = new Item(model, self.character);
        return newItem;
    },
    hasPerkSearch: function(search) {
        var foundPerk = false,
            self = this;
        if (self.perks) {
            var vSearch = search.toLowerCase();
            self.perks.forEach(function(perk) {
                if (perk.name.toLowerCase().indexOf(vSearch) > -1 || perk.description.toLowerCase().indexOf(vSearch) > -1)
                    foundPerk = true;
            });
        }
        return foundPerk;
    },
    hashProgress: function(state) {
        var self = this;
        if (typeof self.progression !== "undefined") {
            /* Missing Perks */
            if (state == "1" && self.progression === false) {
                return true;
            }
            /* Filled perks but not maxed out */
            else if (state == "2" && self.progression === true && self.isGridComplete === false) {
                return true;
            }
            /* Maxed weapons (Gold Borders only) */
            else if (state == "3" && self.progression === true && self.isGridComplete === true) {
                return true;
            } else {
                return false;
            }
        } else {
            return false;
        }
    },
    hasGeneral: function(type) {
        if (type == "Engrams" && this.description.indexOf("Engram") > -1 && this.isEquipment === false) {
            return true;
        } else if (type in tgd.DestinyGeneralItems && tgd.DestinyGeneralItems[type].indexOf(this.id) > -1) {
            return true;
        } else {
            return false;
        }
    },
    _cspStat: function() {
        var stat = this.primaryStat();
        if (app.armorViewBy() == 'CSP' && _.has(tgd.DestinyMaxCSP, this.bucketType)) {
            stat = this.getValue("All") + "-" + this.getValue("MaxLightCSP");
        }
        return stat;
    },
    _cspClass: function() {
        var rollType = "None";
        if (_.has(tgd.DestinyMaxCSP, this.bucketType)) {
            var maxLightPercent = ko.unwrap(this.maxLightPercent),
                minAvgPercentNeeded = ko.unwrap(app.minAvgPercentNeeded);;
            rollType = "BadRoll";
            if (maxLightPercent >= minAvgPercentNeeded) {
                rollType = "GoodRoll";
            }
            //4 pts under the requirement is still good enough to maybe get you there
            else if (maxLightPercent >= (minAvgPercentNeeded - 4)) {
                rollType = "OkayRoll";
            }
        }
        if (this.weaponIndex > -1) {
            rollType = this.damageTypeName;
        }
        return rollType;
    },
    _primaryStatValue: function() {
        if (this.primaryStat && typeof this.primaryStat == "function") {
            var primaryStat = ko.unwrap(this.primaryStat());
            if (this.objectives && typeof primaryStat == "string" && primaryStat.indexOf("/") > -1) {
                primaryStat = parseInt(primaryStat.split("/")[0]);
            }
            return primaryStat;
        }
    },
    _isVisible: function() {
        var $parent = app,
            self = this;

        if (typeof self.id == "undefined") {
            return false;
        }

        var dmgFilter = true;
        var progressFilter = true;
        var weaponFilter = true;
        var armorFilter = true;
        var showDuplicate = true;
        var setFilter = true;
        var searchFilter = ($parent.searchKeyword() === '' || $parent.searchKeyword() !== "" && self.description.toLowerCase().indexOf($parent.searchKeyword().toLowerCase()) > -1);
        var tierFilter = $parent.tierFilter() == "0" || $parent.tierFilter() == self.tierType;

        var itemStatValue = "";
        if (this.primaryStatValue && this.primaryStatValue()) {
            itemStatValue = this.primaryStatValue().toString();
        }
        var operator = $parent.searchKeyword().substring(0, 1);
        if (itemStatValue !== "" && itemStatValue.indexOf("%") == -1 && (operator == ">" || operator == "<" || $.isNumeric($parent.searchKeyword()))) {
            var operand = "=",
                searchValue = $parent.searchKeyword();
            if (operator === ">" || operator === "<") {
                operand = operator + operand;
                searchValue = searchValue.replace(operator, '');
            } else {
                operand = "=" + operand;
            }
            searchFilter = new Function('return ' + itemStatValue + operand + searchValue.toString())();
        }

        if (self.armorIndex > -1 || self.weaponIndex > -1) {
            setFilter = $parent.setFilter().length === 0 || $parent.setFilter().indexOf(self.id) > -1;
            searchFilter = searchFilter || self.hasPerkSearch($parent.searchKeyword());
            if (self.weaponIndex > -1) {
                dmgFilter = $parent.dmgFilter().length === 0 || $parent.dmgFilter().indexOf(self.damageTypeName) > -1;
                weaponFilter = $parent.weaponFilter() == "0" || $parent.weaponFilter() == self.typeName;
            } else {
                var types = _.map(_.pluck(self.perks, 'name'), function(name) {
                    return name && name.split(" ")[0];
                });
                dmgFilter = $parent.dmgFilter().length === 0 || _.intersection($parent.dmgFilter(), types).length > 0;
                armorFilter = $parent.armorFilter() == "0" || $parent.armorFilter() == self.bucketType;
            }
            progressFilter = $parent.progressFilter() == "0" || self.hashProgress($parent.progressFilter());
        }
        generalFilter = $parent.generalFilter() == "0" || self.hasGeneral($parent.generalFilter());
        showDuplicate = $parent.customFilter() === false || ($parent.customFilter() === true && self.isFiltered() === true);

        var isVisible = (searchFilter) && (dmgFilter) && (setFilter) && (tierFilter) && (progressFilter) && (weaponFilter) && (armorFilter) && (generalFilter) && (showDuplicate);
        //console.timeEnd("isVisible");
        /*if ( self.description == "Red Death") {
			tgd.localLog( "searchFilter: " + searchFilter);
			tgd.localLog( "dmgFilter: " + dmgFilter);
			tgd.localLog( "setFilter: " + setFilter);
			tgd.localLog( "tierFilter: " + tierFilter);
			tgd.localLog( "progressFilter: " + progressFilter);
			tgd.localLog( "weaponFilter: " + weaponFilter);
			tgd.localLog( "armorFilter: " + armorFilter);
			tgd.localLog( "generalFilter: " + generalFilter);
			tgd.localLog( "showDuplicate: " + showDuplicate);
		}*/
        return isVisible;
    },
    /* helper function that unequips the current item in favor of anything else */
    unequip: function(callback) {
        var self = this;
        tgd.localLog('trying to unequip too!');
        if (self.isEquipped() === true) {
            tgd.localLog("and its actually equipped");
            var otherEquipped = false,
                itemIndex = -1,
                otherItems = _.sortBy(_.filter(self.character.items(), function(item) {
                    return (item._id != self._id && item.bucketType == self.bucketType);
                }), function(item) {
                    return [item.getValue("Light") * -1, item.getValue("CSP") * -1];
                });
            //console.log("other items: " + _.pluck(otherItems, 'description'));
            if (otherItems.length > 0) {
                /* if the only remainings item are exotic ensure the other buckets dont have an exotic equipped */
                var minTier = _.min(_.pluck(otherItems, 'tierType'));
                var tryNextItem = function() {
                    var item = otherItems[++itemIndex];
                    if (_.isUndefined(item)) {
                        if (callback) callback(false);
                        else {
                            tgd.localLog("transfer error 5");
                            $.toaster({
                                priority: 'danger',
                                title: 'Error',
                                message: app.activeText().cannot_unequip + self.description,
                                settings: {
                                    timeout: tgd.defaults.toastTimeout
                                }
                            });
                        }
                        return;
                    }
                    tgd.localLog(item.description);
                    /* still haven't found a match */
                    if (otherEquipped === false) {
                        if (item != self && item.equip) {
                            tgd.localLog("trying to equip " + item.description);
                            item.equip(self.characterId(), function(isEquipped, result) {
                                tgd.localLog(item.description + " result was " + isEquipped);
                                if (isEquipped === true) {
                                    otherEquipped = true;
                                    callback(true);
                                } else if (isEquipped === false && result && result.ErrorCode && result.ErrorCode === 1634) {
                                    callback(false);
                                } else {
                                    tryNextItem();
                                    tgd.localLog("tryNextItem");
                                }
                            });
                        } else {
                            tryNextItem();
                            tgd.localLog("tryNextItem");
                        }
                    }
                };
                tgd.localLog("tryNextItem");
                tgd.localLog("trying to unequip item, the min tier of the items I can equip is: " + minTier);
                if (minTier == 6) {
                    var otherItemUnequipped = false;
                    var otherBucketTypes = self.weaponIndex > -1 ? _.clone(tgd.DestinyWeaponPieces) : _.clone(tgd.DestinyArmorPieces);
                    otherBucketTypes.splice(self.weaponIndex > -1 ? self.weaponIndex : self.armorIndex, 1);
                    _.each(otherBucketTypes, function(bucketType) {
                        var itemEquipped = self.character.itemEquipped(bucketType);
                        if (itemEquipped && itemEquipped.tierType && itemEquipped.tierType == 6) {
                            tgd.localLog("going to unequip " + itemEquipped.description);
                            itemEquipped.unequip(function(result) {
                                //unequip was successful
                                if (result) {
                                    tryNextItem();
                                }
                                //unequip failed
                                else {
                                    tgd.localLog("transfer error 6");
                                    $.toaster({
                                        priority: 'danger',
                                        title: 'Error',
                                        message: app.activeText().unable_unequip + itemEquipped.description,
                                        settings: {
                                            timeout: tgd.defaults.toastTimeout
                                        }
                                    });
                                    callback(false);
                                }
                            });
                            otherItemUnequipped = true;
                        }
                    });
                    if (!otherItemUnequipped) {
                        tgd.localLog("no other exotic equipped, safe to equip");
                        tryNextItem();
                    }
                } else {
                    tryNextItem();
                }
            } else {
                tgd.localLog("refused to unequip");
                callback(false);
            }
        } else {
            tgd.localLog("but not equipped");
            callback(true);
        }
    },
    equip: function(targetCharacterId, callback) {
        var self = this;
        var done = function() {
            tgd.localLog("making bungie call to equip " + self.description);
            app.bungie.equip(targetCharacterId, self._id, function(e, result) {
                if (result && result.Message && result.Message == "Ok") {
                    var done = function() {
                        tgd.localLog(self);
                        tgd.localLog("result was OKed for " + self.description);
                        tgd.localLog(result);
                        self.isEquipped(true);
                        self.character.items().forEach(function(item) {
                            if (item._id != self._id && item.bucketType == self.bucketType && item.isEquipped() === true) {
                                item.isEquipped(false);
                            }
                        });
                        if (self.bucketType == "Emblem") {
                            self.character.icon(self.icon);
                            self.character.background(self.backgroundPath);
                        }
                        if (callback) callback(true);
                    };
                    if (!(self instanceof Item)) {
                        app.findReference(self, function(item) {
                            self = item;
                            done();
                        });
                        tgd.localLog("changing reference of self to actual item");
                    } else {
                        done();
                    }
                } else {
                    tgd.localLog("transfer error 7 " + result);
                    /* this is by design if the user equips something they couldn't the app shouldn't assume a replacement unless it's via loadouts */
                    if (callback) callback(false, result);
                    else if (result && result.Message) {
                        $.toaster({
                            priority: 'info',
                            title: 'Error',
                            message: result.Message,
                            settings: {
                                timeout: tgd.defaults.toastTimeout
                            }
                        });
                    }
                    //TODO perhaps log this condition and determine the cause
                    else {
                        BootstrapDialog.alert(self.description + ":" + app.activeText().cannot_equip + (result && result.error) ? result.error : "");
                    }
                }
            });
        };
        var sourceCharacterId = self.characterId();
        tgd.localLog("equip called from " + sourceCharacterId + " to " + targetCharacterId);
        if (targetCharacterId == sourceCharacterId) {
            tgd.localLog("item is already in the character");
            /* if item is exotic */
            if (self.tierType == 6 && self.hasLifeExotic === false) {
                //tgd.localLog("item is exotic");
                var otherExoticFound = false,
                    otherBucketTypes = self.weaponIndex > -1 ? _.clone(tgd.DestinyWeaponPieces) : _.clone(tgd.DestinyArmorPieces);
                otherBucketTypes.splice(self.weaponIndex > -1 ? self.weaponIndex : self.armorIndex, 1);
                //tgd.localLog("the other bucket types are " + JSON.stringify(otherBucketTypes));
                _.each(otherBucketTypes, function(bucketType) {
                    var otherExotic = _.filter(_.where(self.character.items(), {
                        bucketType: bucketType,
                        tierType: 6
                    }), function(item) {
                        return item.isEquipped();
                    });
                    //tgd.localLog( "otherExotic: " + JSON.stringify(_.pluck(otherExotic,'description')) );
                    if (otherExotic.length > 0) {
                        //tgd.localLog("found another exotic equipped " + otherExotic[0].description);
                        otherExoticFound = true;
                        otherExotic[0].unequip(done);
                    }
                });
                if (otherExoticFound === false) {
                    done();
                }
            } else {
                //tgd.localLog("request is not part of a loadout");
                done();
            }
        } else {
            tgd.localLog("item is NOT already in the character");
            self.store(targetCharacterId, function(newProfile) {
                tgd.localLog("item is now in the target destination");
                self.character = newProfile;
                self.characterId(newProfile.id);
                self.equip(targetCharacterId, callback);
            });
        }
    },
    transfer: function(sourceCharacterId, targetCharacterId, amount, cb) {
        //tgd.localLog("Item.transfer");
        //tgd.localLog(arguments);
        var self = this,
            x, y, characters = app.characters();
        if (characters.length === 0) {
            /*ga('send', 'exception', {
                'exDescription': "No characters found to transfer with " + JSON.stringify(app.activeUser()),
                'exFatal': false,
                'appVersion': tgd.version,
                'hitCallback': function() {
                    tgd.localLog("crash reported");
                }
            });*/
            app.refresh();
            return BootstrapDialog.alert("Attempted a transfer with no characters loaded, how is that possible? Please report this issue to my Github.");
        }

        var isVault = (targetCharacterId == "Vault");
        var ids = _.pluck(characters, 'id');
        x = characters[ids.indexOf(sourceCharacterId)];
        y = characters[ids.indexOf(targetCharacterId)];
        if (_.isUndefined(y)) {
            return app.refresh();
        }
        //This is a stop-gap measure because materials/consumables don't have the replacement tech built-in
        var itemsInDestination = _.where(y.items(), {
            bucketType: self.bucketType
        }).length;
        var maxBucketSize = self.bucketType in tgd.DestinyBucketSizes ? tgd.DestinyBucketSizes[self.bucketType] : 10;
        if (itemsInDestination == maxBucketSize && y.id != "Vault") {
            return BootstrapDialog.alert("Cannot transfer " + self.description + " because " + self.bucketType + " is full.");
        }
        //tgd.localLog( self.description );
        app.bungie.transfer(isVault ? sourceCharacterId : targetCharacterId, self._id, self.id, amount, isVault, function(e, result) {
            //tgd.localLog("app.bungie.transfer after");
            //tgd.localLog(arguments);			
            if (result && result.Message && result.Message == "Ok") {
                if (self.bucketType == "Materials" || self.bucketType == "Consumables") {
                    console.log("xfered mats and consumables");
					var siblingItems = _.where( x.items(), { id: self.id });
					var newTotalAmount = tgd.sum(_.map(siblingItems,function(item){ return item.primaryStat() }))  - amount;
					console.log("newTotalAmount", newTotalAmount, amount);
					var totalItemStacks = Math.ceil(newTotalAmount / self.maxStackSize);
					console.log("totalItemStacks", totalItemStacks);
					_.each(siblingItems, function(item, index){
						if ( index + 1 > totalItemStacks ) { x.items.remove(item); }
						else {
							newTotalAmount = (newTotalAmount % self.maxStackSize > 0 ? newTotalAmount % self.maxStackSize : self.maxStackSize);
							console.log("newTotalAmount", newTotalAmount);
							item.primaryStat( newTotalAmount );
							newTotalAmount = newTotalAmount - newTotalAmount;
						}
					});
					
                } else {
                    tgd.localLog("removing " + self.description + " from " + x.uniqueName() + " currently at " + x.items().length);
                    x.items.remove(function(item) {
                        return item._id == self._id;
                    });
                    tgd.localLog("after removal " + x.items().length);
                    self.character = y;
                    y.items.push(self);
                    setTimeout(function() {
                        self.characterId(targetCharacterId);
                    }, 500);
                    tgd.localLog("adding " + self.description + " to " + y.uniqueName());
                }
                //not sure why this is nessecary but w/o it the xfers have a delay that cause free slot errors to show up
                setTimeout(function() {
                    if (cb) cb(y, x);
                }, 500);
            } else if (cb) {
                tgd.localLog(self.description + "  error during transfer!!!");
                tgd.localLog(result);
                cb(y, x, result);
            } else if (result && result.Message) {
                tgd.localLog("transfer error 1");
                $.toaster({
                    priority: 'info',
                    title: 'Error',
                    message: result.Message,
                    settings: {
                        timeout: tgd.defaults.toastTimeout
                    }
                });
            }
        });
    },
    handleTransfer: function(targetCharacterId, cb) {
        var self = this;
        return function(y, x, result) {
            if (result && result.ErrorCode && (result.ErrorCode == 1656 || result.ErrorCode == 1623)) {
                tgd.localLog("reloading bucket " + self.bucketType);
                /*var characterId = app.characters()[1].id;
				var instanceId = app.characters()[1].weapons()[0]._id;*/
                /*app.bungie.getAccountSummary(function(results) {
                    var characterIndex = _.findWhere(results.data.items, {
                        itemId: self._id
                    }).characterIndex;
                    if (characterIndex > -1) {
                        characterId = results.data.characters[characterIndex].characterBase.characterId;
                    } else {
                        characterId = "Vault";
                    }
                    tgd.localLog(characterId + " is where the item was found, it was supposed to be in " + self.character.id);
                    if (characterId != self.character.id) {
                        var character = _.findWhere(app.characters(), {
                            id: characterId
                        });
                        // handle refresh of other buckets
                        tgd.localLog("found the item elsewhere");
                        if (characterId == targetCharacterId) {
                            tgd.localLog("item is already where it needed to be");
                            x.items.remove(self);
                            self.characterId = targetCharacterId
                            self.character = character;
                            character.items.push(self);
                            if (cb) cb(y, x);
                        } else {
                            tgd.localLog("item is not where it needs to be");
                            x._reloadBucket(self.bucketType, undefined, function() {
                                character._reloadBucket(self.bucketType, undefined, function() {
                                    tgd.localLog("retransferring");
                                    //TODO move this function to a more general area for common use
                                    self.character.id = characterId;
                                    var newItem = Loadout.prototype.findReference(self);
                                    tgd.localLog(newItem.character.id + " has new reference of " + newItem.description);
                                    newItem.store(targetCharacterId, cb);
                                });
                            });
                        }
                    } else {*/
                x._reloadBucket(self.bucketType, undefined, function() {
                    y._reloadBucket(self.bucketType, undefined, function() {
                        tgd.localLog("retransferring");
                        app.findReference(self, function(newItem) {
                            newItem.store(targetCharacterId, cb);
                        });
                    });
                });
                /*    }
                });*/
            } else if (result && result.ErrorCode && result.ErrorCode == 1642) {
                tgd.localLog(self._id + " error code 1642 no item slots using adhoc method for " + self.description);
                x._reloadBucket(self.bucketType, undefined, function() {
                    y._reloadBucket(self.bucketType, undefined, function() {
                        var adhoc = new tgd.Loadout();
                        if (self._id > 0) {
                            adhoc.addUniqueItem({
                                id: self._id,
                                bucketType: self.bucketType,
                                doEquip: false
                            });
                        } else {
                            adhoc.addGenericItem({
                                hash: self.id,
                                bucketType: self.bucketType,
                                characterId: self.characterId()
                            });
                        }
                        var msa = adhoc.transfer(targetCharacterId, true);
                        if (msa.length > 0)
                            tgd.localLog(msa[0]);
                        adhoc.swapItems(msa, targetCharacterId, function() {
                            if (cb) cb(y, x);
                        });
                    });
                });
            } else if (result && result.ErrorCode && result.ErrorCode == 1648) {
                //TODO: TypeError: 'undefined' is not an object (evaluating '_.findWhere(app.characters(), { id: "Vault" }).items')
                var vaultItems = _.findWhere(app.characters(), {
                    id: "Vault"
                }).items();
                var targetItem = _.where(vaultItems, {
                    id: self.id
                });
                if (targetItem.length > 0) {
                    targetItem[0].store(targetCharacterId, function() {
                        self.character.id = targetCharacterId;
                        self.store("Vault", cb);
                    });
                }
            } else if (cb) {
                cb(y, x);
            } else if (result && result.Message) {
                tgd.localLog("transfer error 2");
                $.toaster({
                    priority: 'info',
                    title: 'Error',
                    message: result.Message,
                    settings: {
                        timeout: tgd.defaults.toastTimeout
                    }
                });
            }
        };
    },
    store: function(targetCharacterId, callback) {
        //tgd.localLog(arguments);
        var self = this;
        var sourceCharacterId = self.characterId(),
            defaultTransferAmount = 1;
        var done = function(transferAmount) {
            //console.log("item.store " + self.description + " to " + targetCharacterId + " from " + sourceCharacterId);
            if (targetCharacterId == "Vault") {
                //tgd.localLog("*******from character to vault " + self.description);
                self.unequip(function(result) {
                    //tgd.localLog("********* " + sourceCharacterId + " calling transfer from character to vault " + result);
                    if (result === true) {
                        self.transfer(sourceCharacterId, "Vault", transferAmount, self.handleTransfer(targetCharacterId, callback));
                    } else {
                        if (callback) {
                            callback(self.character);
                        } else {
                            tgd.localLog("transfer error 3");
                            $.toaster({
                                priority: 'danger',
                                title: 'Error',
                                message: "Unable to unequip " + self.description,
                                settings: {
                                    timeout: tgd.defaults.toastTimeout
                                }
                            });
                        }
                    }
                });
            } else if (sourceCharacterId !== "Vault") {
                tgd.localLog("from character to vault to character " + self.description);
                self.unequip(function(result) {
                    if (result === true) {
                        if (self.bucketType == "Subclasses") {
                            if (callback)
                                callback(self.character);
                        } else {
                            tgd.localLog(self.character.uniqueName() + " xfering item to Vault " + self.description);
                            self.transfer(sourceCharacterId, "Vault", transferAmount, self.handleTransfer(targetCharacterId, function() {
                                tgd.localLog(self.character.id + " xfered item to vault and now to " + targetCharacterId);
                                if (self.character.id == targetCharacterId) {
                                    tgd.localLog("took the long route ending it short " + self.description);
                                    if (callback) callback(self.character);
                                } else {
                                    tgd.localLog("taking the short route " + self.description);
                                    self.transfer("Vault", targetCharacterId, transferAmount, self.handleTransfer(targetCharacterId, callback));
                                }
                            }));
                        }
                    } else {
                        if (callback) {
                            callback(self.character);
                        } else {
                            tgd.localLog("transfer error 4");
                            $.toaster({
                                priority: 'danger',
                                title: 'Error',
                                message: "Unable to unequip " + self.description,
                                settings: {
                                    timeout: tgd.defaults.toastTimeout
                                }
                            });
                        }
                    }
                });
            } else {
                tgd.localLog("from vault to character");
                self.transfer("Vault", targetCharacterId, transferAmount, self.handleTransfer(targetCharacterId, callback));
            }
        };
        if (self.bucketType == "Materials" || self.bucketType == "Consumables") {
            if (self.primaryStat() == defaultTransferAmount) {
                done(defaultTransferAmount);
            } else if (app.autoXferStacks() === true || tgd.autoTransferStacks === true) {
                done(self.primaryStat());
            } else {
                var confirmTransfer = new tgd.transferConfirm(self, targetCharacterId, app.orderedCharacters, done);
                var defaultAction = function() {
                    confirmTransfer.finishTransfer(confirmTransfer.consolidate());
                };
                (new tgd.koDialog({
                    templateName: 'confirmTransferTemplate',
                    viewModel: confirmTransfer,
                    onFinish: defaultAction,
                    buttons: [{
                        label: app.activeText().transfer,
                        cssClass: 'btn-primary',
                        action: defaultAction
                    }, {
                        label: app.activeText().close_msg,
                        action: function(dialogItself) {
                            dialogItself.close();
                        }
                    }]
                })).title(app.activeText().transfer + " " + self.description).show(true, function() {}, function() {
                    $("input.materialsAmount").select();
                });
            }
        } else {
            var adhoc = new tgd.Loadout();
            adhoc.addUniqueItem({
                id: self._id,
                bucketType: self.bucketType,
                doEquip: false
            });
            var result = adhoc.transfer(targetCharacterId, true)[0];
            if (result && result.swapItem) {
                adhoc.promptUserConfirm([result], targetCharacterId, callback);
            } else {
                done(defaultTransferAmount);
            }
        }
    },
    normalize: function(characters) {
        app.normalizeSingle(this.description, characters, false, undefined);
    },
    consolidate: function(targetCharacterId, description, selectedCharacters) {
        //tgd.localLog(targetCharacterId);
        //tgd.localLog(description);
        var activeCharacters = (typeof selectedCharacters == "undefined") ? [] : selectedCharacters;
        var getNextStack = (function() {
            var i = 0;
            var chars = _.filter(app.orderedCharacters(), function(c) {
                return (c.id !== targetCharacterId && activeCharacters.length === 0) || (activeCharacters.indexOf(c.id) > -1);
            });
            var stacks = _.flatten(_.map(chars, function(c) {
                return _.filter(c.items(), {
                    description: description
                });
            }));
            return function() {
                return i >= stacks.length ? undefined : stacks[i++];
            };
        })();

        var nextTransfer = function(callback) {
            var theStack = getNextStack();

            if (typeof theStack == "undefined") {
                //tgd.localLog("all items consolidated");
                if (callback !== undefined) {
                    callback();
                }
                return;
            }

            //transferAmount needs to be defined once and reused bc querying the primaryStat value mid-xfers results in merging qty amounts with existing stacks.
            var transferAmount = theStack.primaryStat();

            //tgd.localLog("xfer " + transferAmount + " from: " + theStack.character.id + ", to: " + targetCharacterId);

            if (targetCharacterId == "Vault") {
                theStack.transfer(theStack.character.id, "Vault", transferAmount, function() {
                    nextTransfer(callback);
                });
            } else if (theStack.character.id == "Vault") {
                theStack.transfer("Vault", targetCharacterId, transferAmount, function() {
                    nextTransfer(callback);
                });
            } else if (theStack.character.id == targetCharacterId) {
                nextTransfer(callback);
            } else {
                theStack.transfer(theStack.character.id, "Vault", transferAmount, function() {
                    theStack.transfer("Vault", targetCharacterId, transferAmount, function() {
                        nextTransfer(callback);
                    });
                });
            }
        };

        // kick off transfers
        nextTransfer(undefined);
    },
    showExtras: function() {
        var self = this;

        var extrasPopup = new tgd.extrasPopup(self);
        (new tgd.koDialog({
            templateName: 'normalizeTemplate',
            viewModel: extrasPopup,
            buttons: [{
                label: 'Normalize',
                cssClass: 'btn-primary',
                action: function(dialogItself) {
                    var characters = extrasPopup.selectedCharacters();
                    if (characters.length <= 1) {
                        BootstrapDialog.alert("Need to select two or more characters.");
                        return;
                    }
                    self.normalize(characters);
                    dialogItself.close();
                }
            }, {
                label: 'Consolidate',
                cssClass: 'btn-primary',
                action: function(dialogItself) {
                    var characters = _.pluck(extrasPopup.selectedCharacters(), 'id');
                    self.consolidate(self.character.id, self.description, characters);
                    dialogItself.close();
                }
            }, {
                label: 'Close',
                action: function(dialogItself) {
                    dialogItself.close();
                }
            }]
        })).title("Extras for " + self.description).show(true);
    },
    toggleLock: function() {
        var self = this;
        // have to use an actual character id and not the vault for lock/unlock
        var characterId = (self.characterId() == 'Vault') ? _.find(app.orderedCharacters(), function(c) {
            return c.id !== 'Vault';
        }).id : self.character.id;
        var newState = !self.locked();
        //console.log(characterId + " changing " + self._id + " to be " + (newState ? "locked" : "unlocked"));

        app.bungie.setlockstate(characterId, self._id, newState, function(results, response) {
            if (response.ErrorCode !== 1) {
                return BootstrapDialog.alert("setlockstate error: " + JSON.stringify(response));
            } else {
                //console.log(characterId + " changed " + self._id + " to be " + (newState ? "locked" : "unlocked"));
                self.locked(newState);
            }
        });
    },
    openInDestinyTracker: function() {
        window.open("http://db.destinytracker.com/items/" + this.id, tgd.openTabAs);
    },
    openInArmory: function() {
        window.open("https://www.bungie.net/en/armory/Detail?type=item&item=" + this.id, tgd.openTabAs);
    },
    openInDestinyDB: function() {
        window.open(this.href, tgd.openTabAs);
    },
    getValue: function(type) {
        var value;
        if (type == "Light") {
            value = this.primaryValues.Default;
        } else if (type == "MaxLightCSP") {
            value = this.primaryValues.MaxLightCSP;
        } else if (type == "MaxLightPercent") {
            value = this.maxLightPercent();
        } else if (type == "All") {
            value = this.primaryValues.CSP;
        } else if (_.isObject(this.stats) && type in this.stats) {
            value = parseInt(this.stats[type]);
        } else {
            value = 0;
        }
        return value;
    }
};