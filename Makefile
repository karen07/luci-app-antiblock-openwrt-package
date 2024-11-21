# See /LICENSE for more information.
# This is free software, licensed under the GNU General Public License v2.

include $(TOPDIR)/rules.mk

PKG_NAME:=luci-app-antiblock
PKG_VERSION:=1.0.0
PKG_RELEASE:=1
PKG_LICENSE:=GPL-3.0-or-later

LUCI_TITLE:=Antiblock Web UI
LUCI_URL:=https://github.com/karen07/luci-app-antiblock-openwrt-package
LUCI_DESCRIPTION:=Provides Web UI for Antiblock
LUCI_DEPENDS:=+luci-base +antiblock

include ../../feeds/luci/luci.mk

# call BuildPackage - OpenWrt buildroot signature