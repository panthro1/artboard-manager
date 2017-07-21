// TODO: Setup arboard naming scheme using a RegEx?
// TODO: Add a settings panel (or read settings from a sketchsettings.json file)
// TODO: treat a group of selected artboards as a whole, and insert them one after the other when dragged over an existing row

// Config
const RENAME_ARTBOARDS = false
const ARTBOARD_BASENAMES = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M", "N", "O", "P", "Q", "R", "S", "T", "U", "V", "W", "X", "Y", "Z"]
const SNAPPING_DISTANCE = 400
const GRID_V_SPACE = 500
const GRID_H_SPACE = 50

let config = {
  getKey: function(keyName){
    if (keyName == "shouldRename") {
      return RENAME_ARTBOARDS;
    }
    return true;
  }
}

const sort_by_x_position = function(a,b){
  return a.frame().left() - b.frame().left();
}
const sort_by_y_position = function(a,b) {
  return a.frame().top() - b.frame().top();
}

export function ArtboardChanged(context) {
  console.log("ArtboardChanged")
  // Called on
  // - Add
  // - Remove
  // - Duplicate
  // - Move
  // - Select
  // - Unselect

  // This function is called when an artboard is added, *and* when artboards are moved
  // so we need to somehow filter the event so that we don't end up arranging the artboards
  // twice after each move operation. By now, we'll just ignore the event…
  // console.log(context)
  // console.log(context.actionContext)
}

const anArtboardIsSelected = function(context){
  console.log(context.api()._object.document)
  const selectedLayers = context.api().selectedDocument._object.selectedLayers().layers()
  if (selectedLayers.count() > 0) {
    if ( selectedLayers.firstObject().className() == "MSArtboardGroup" ) {
      return true
    }
  }
  return false
}

export function Duplicate(context) {
  console.log('Duplicate')
  if (anArtboardIsSelected(context)) {
    ArrangeArtboards(context)
  }
}

export function LayersMoved (context) {
  console.log("LayersMoved")
  // This event is not called when an artboard is resized or added
  const movedLayers = Array.from(context.actionContext.layers)
  let needToArrange = false

  for (const layer of movedLayers) {
    if(layer.className() == "MSArtboardGroup") {
      needToArrange = true
    }
  }
  if (needToArrange) {
    ArrangeArtboards(context)
  }
}

export function ArrangeArtboards(context) {
  console.log("ArrangeArtboards")
  const doc = MSDocument.currentDocument()
  const originalSelection = doc.selectedLayers()
  const artboards = doc.currentPage().artboards()

  const layoutBounds = MSLayerGroup.groupBoundsForContainer(MSLayerArray.arrayWithLayers(artboards))
  const layoutWidth  = layoutBounds.size.width
  const layoutHeight = layoutBounds.size.height
  const layoutX  = layoutBounds.origin.x
  const layoutY = layoutBounds.origin.y

  const numberOfRows = (layoutHeight / GRID_V_SPACE).toFixed()

  let currentRow = 0
  let currentRowPosition = layoutY
  let rows = []

  while (currentRow < numberOfRows) {

    console.log("Processing row " + currentRow + ", which starts at position: " + (currentRowPosition - layoutY))
    let currentRowArtboards = []
    for (const artboard of Array.from(artboards)) {
      if(Math.abs(artboard.frame().y() - currentRowPosition) <= SNAPPING_DISTANCE ) {
        artboard.frame().y = currentRowPosition
        currentRowArtboards.push(artboard)
      }
    }
    if (currentRowArtboards.length > 0) {
      rows.push(currentRowArtboards)
    }
    currentRowPosition += GRID_V_SPACE
    currentRow++
  }

  // Now, update positions for all artboards
  let verticalOffset = 0
  let rowNumber = 0
  for (const row of rows) {

    // Vertical positions
    let tallestArtboard = 0
    for (const artboard of row) {
      artboard.frame().y = verticalOffset + layoutY
      tallestArtboard = Math.max(tallestArtboard, artboard.frame().height())
    }
    verticalOffset += tallestArtboard + (GRID_V_SPACE/2)

    // Horizontal positions & name
    let offsetX = 0
    let columnNumber = 1
    for (const artboard of row.sort(sort_by_x_position)) {
      artboard.frame().x = layoutX + offsetX
      offsetX += artboard.frame().width() + GRID_H_SPACE
      if (config.getKey('shouldRename')) {
        artboard.setName(ARTBOARD_BASENAMES[rowNumber] + columnNumber)
      }
      columnNumber++
    }
    rowNumber++
  }

  // Update stacking
  for (const artboard of Array.from(artboards).sort(sort_by_x_position).sort(sort_by_y_position)) {
    const parent = artboard.parentGroup()
    artboard.removeFromParent()
    parent.insertLayer_atIndex(artboard, 0)
  }
  // Restore original selection
  for (const layer of Array.from(originalSelection)) {
    layer.isSelected = true
  }
}

export function Resize(context){
  console.log("Resize")
  console.log(context)
  console.log(context.api().selectedDocument._object)
  // console.log(context.api().selectedDocument.selectedLayers.nativeLayers)
  // console.log(context.api()._object)
  // if (context.actionContext.name == "NormalResize") {
  //   if (anArtboardIsSelected(context)) {
  //     ArrangeArtboards(context)
  //   }
  // }
}
