include $(TOPDIR)/rules.mk

PKG_NAME:=luci-app-antiblock
PKG_LICENSE:=GPL-3.0-or-later
PKG_MAINTAINER:=Khachatryan Karen <karen0734@gmail.com>
PKG_VERSION:=1.0.0
PKG_RELEASE:=1

LUCI_TITLE:=AntiBlock Web UI
LUCI_URL:=https://github.com/karen07/luci-app-antiblock-openwrt-package
LUCI_DESCRIPTION:=Provides Web UI for AntiBlock
LUCI_DEPENDS:=+luci-base +antiblock

include ../../luci.mk

# call BuildPackage - OpenWrt buildroot signature
