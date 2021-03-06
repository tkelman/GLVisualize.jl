using GLVisualize, GeometryTypes, GLAbstraction, Colors, FileIO
if !isdefined(:runtests)
	window = glscreen()
end

# a few helper functions to generate images
typealias NColor{N, T} Colorant{T, N}
fillcolor{T <: NColor{4}}(::Type{T}) = T(0,1,0,1)
fillcolor{T <: NColor{3}}(::Type{T}) = T(0,1,0)

# create different images with different color types (not an exhaustive list of supported types)
arrays = map((RGBA{U8}, RGBA{Float32}, RGB{U8}, RGB{Float32}, BGRA{U8}, BGR{Float32})) do C
     C[fillcolor(C) for x=1:45,y=1:45]
 end
# load a few images from the asset folder with FileIO.load (that's what loadasset calls)
loaded_imgs = map(x->loadasset("test_images", x), readdir(assetpath("test_images")))

# combine them all into one array and add an animated gif and a few other images
x = Any[
    arrays..., loaded_imgs...,
    loadasset("kittens-look.gif"),
    loadasset("mario", "stand", "right.png"),
    loadasset("mario", "jump", "left.gif"),
]

# visualize all images and convert the array to be a vector of element type context
# This shouldn't be necessary, but it seems map is not able to infer the type alone
images = convert(Vector{Context}, map(visualize, x))
# make it a grid
images = reshape(images, (4,4))
# GLVisualize offers a few helpers to visualize arrays of render objects
# spaced out as the underlying array. So this will create a grid whereas every
# item is 128x128x128 pixels big
img_vis = visualize(images, scale=Vec3f0(128))
view(img_vis, window)



if !isdefined(:runtests)
	renderloop(window)
end
